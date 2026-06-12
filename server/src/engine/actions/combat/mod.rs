use std::collections::HashSet;

use crate::game::card::{CardType, ObjectId};
use crate::game::event::GameEvent;
use crate::game::phases_and_steps::{CombatStep, Phase};
use crate::game::state::{AttackTarget, AttackerInfo, BlockerInfo, CombatState, GameState};

use super::{validate_player, ActionError};

/// Declare attackers. CR 508
/// Must be in the declare attackers step. Each attacker must be an untapped
/// creature the player controls.
/// TODO: creatures with summoning sickness can't attack
/// TODO: creatures with defender can't attack
/// TODO: vigilance (don't tap)
pub fn declare_attackers(
    state: &mut GameState,
    player_id: &str,
    attackers: Vec<AttackerInfo>,
) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if !matches!(state.phase, Phase::Combat(CombatStep::DeclareAttackers)) {
        return Err(ActionError::Illegal("not in declare attackers step".into()));
    }
    if !state.has_priority(player_id) {
        return Err(ActionError::Illegal("you don't have priority".into()));
    }

    for attacker in &attackers {
        let card = state
            .objects
            .get(&attacker.object_id)
            .ok_or_else(|| ActionError::Illegal("attacker not found".into()))?;

        if !state.battlefield.contains(&attacker.object_id) {
            return Err(ActionError::Illegal(
                "attacker is not on the battlefield".into(),
            ));
        }
        if card.controller.as_deref() != Some(player_id) {
            return Err(ActionError::Illegal(
                "you don't control this creature".into(),
            ));
        }
        if !card.definition.card_types.contains(&CardType::Creature) {
            return Err(ActionError::Illegal("only creatures can attack".into()));
        }
        if card.tapped {
            return Err(ActionError::Illegal("tapped creatures can't attack".into()));
        }
        // CR 302.6 — Summoning sickness (haste bypasses)
        if card.is_summoning_sick() {
            return Err(ActionError::Illegal(
                "creature has summoning sickness".into(),
            ));
        }
    }

    // Tap all attackers
    // TODO: vigilance skips tapping
    for attacker in &attackers {
        state
            .objects
            .get_mut(&attacker.object_id)
            .ok_or_else(|| ActionError::Illegal("attacker not found".into()))?
            .tapped = true;
    }

    // CR 508.2 — Emit the attack event so "whenever you attack" abilities trigger.
    let attack_pairs: Vec<(ObjectId, AttackTarget)> = attackers
        .iter()
        .map(|a| (a.object_id, a.target.clone()))
        .collect();

    state.combat = Some(CombatState {
        attackers,
        blockers: vec![],
        blockers_declared: false,
        dealt_first_strike: HashSet::new(),
    });

    state.emit_event(&GameEvent::Attacking {
        player_id: player_id.to_string(),
        attackers: attack_pairs,
    });

    state.record_action();
    super::check_state_and_triggers(state);
    Ok(())
}

/// Declare blockers. CR 509
/// Must be in the declare blockers step. Each blocker must be an untapped
/// creature the defending player controls.
/// TODO: creatures with restrictions on blocking (e.g., can't block, menace)
pub fn declare_blockers(
    state: &mut GameState,
    player_id: &str,
    blockers: Vec<BlockerInfo>,
) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if !matches!(state.phase, Phase::Combat(CombatStep::DeclareBlockers)) {
        return Err(ActionError::Illegal("not in declare blockers step".into()));
    }

    let combat = state
        .combat
        .as_ref()
        .ok_or_else(|| ActionError::Illegal("no combat in progress".into()))?;

    let is_defending = combat
        .attackers
        .iter()
        .any(|a| matches!(&a.target, AttackTarget::Player(pid) if pid == player_id));

    if !is_defending {
        return Err(ActionError::Illegal(
            "you are not a defending player".into(),
        ));
    }

    // CR 509.1 — Blockers are declared once per combat.
    if combat.blockers_declared {
        return Err(ActionError::Illegal(
            "blockers have already been declared".into(),
        ));
    }

    for blocker in &blockers {
        let card = state
            .objects
            .get(&blocker.object_id)
            .ok_or_else(|| ActionError::Illegal("blocker not found".into()))?;

        if !state.battlefield.contains(&blocker.object_id) {
            return Err(ActionError::Illegal(
                "blocker is not on the battlefield".into(),
            ));
        }
        if card.controller.as_deref() != Some(player_id) {
            return Err(ActionError::Illegal(
                "you don't control this creature".into(),
            ));
        }
        if !card.definition.card_types.contains(&CardType::Creature) {
            return Err(ActionError::Illegal("only creatures can block".into()));
        }
        if card.tapped {
            return Err(ActionError::Illegal("tapped creatures can't block".into()));
        }

        let valid_attacker = combat
            .attackers
            .iter()
            .any(|a| a.object_id == blocker.blocking);
        if !valid_attacker {
            return Err(ActionError::Illegal("not blocking a valid attacker".into()));
        }
    }

    let combat = state
        .combat
        .as_mut()
        .ok_or_else(|| ActionError::Illegal("no combat in progress".into()))?;
    combat.blockers = blockers;
    combat.blockers_declared = true;

    state.record_action();
    Ok(())
}

#[cfg(test)]
mod tests;
