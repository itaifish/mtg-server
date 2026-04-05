use crate::game::card::{CardType, ObjectId};
use crate::game::phases_and_steps::{CombatStep, Phase};
use crate::game::state::{AttackTarget, AttackerInfo, BlockerInfo, CombatState, GameState};

use super::{validate_player, ActionError};
use crate::engine::state_based;
use crate::engine::triggers;

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

    state.combat = Some(CombatState {
        attackers,
        blockers: vec![],
    });

    state.record_action();
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

    state
        .combat
        .as_mut()
        .ok_or_else(|| ActionError::Illegal("no combat in progress".into()))?
        .blockers = blockers;

    state.record_action();
    Ok(())
}

/// Resolve combat damage. CR 510
/// Each unblocked attacker deals damage to what it's attacking.
/// Blocked attackers and blockers deal damage to each other.
/// TODO: first strike, double strike, trample, deathtouch
pub fn resolve_combat_damage(state: &mut GameState) -> Result<(), ActionError> {
    if !matches!(state.phase, Phase::Combat(CombatStep::CombatDamage)) {
        return Err(ActionError::Illegal("not in combat damage step".into()));
    }

    let combat = match state.combat.take() {
        Some(c) => c,
        None => return Ok(()),
    };

    for attacker_info in &combat.attackers {
        let attacker_power = state
            .objects
            .get(&attacker_info.object_id)
            .and_then(|a| a.effective_power())
            .unwrap_or(0);

        let blockers_for_this: Vec<ObjectId> = combat
            .blockers
            .iter()
            .filter(|b| b.blocking == attacker_info.object_id)
            .map(|b| b.object_id)
            .collect();

        if blockers_for_this.is_empty() {
            // Unblocked — deal damage to attack target
            if attacker_power > 0 {
                match &attacker_info.target {
                    AttackTarget::Player(pid) => {
                        state.deal_damage_to_player(pid, attacker_power as u32);
                    }
                    // TODO: damage to planeswalkers (remove loyalty)
                    // TODO: damage to battles (remove defense)
                    _ => {}
                }
            }
        } else {
            // Blocked — attacker deals damage to first blocker,
            // each blocker deals its power to the attacker
            // TODO: damage assignment order, trample
            if let Some(&first_blocker_id) = blockers_for_this.first() {
                if attacker_power > 0 {
                    if let Some(b) = state.objects.get_mut(&first_blocker_id) {
                        b.damage_marked += attacker_power as u32;
                    }
                }
            }
            for &blocker_id in &blockers_for_this {
                let blocker_power = state
                    .objects
                    .get(&blocker_id)
                    .and_then(|b| b.effective_power())
                    .unwrap_or(0);
                if blocker_power > 0 {
                    if let Some(a) = state.objects.get_mut(&attacker_info.object_id) {
                        a.damage_marked += blocker_power as u32;
                    }
                }
            }
        }
    }

    state.record_action();
    state_based::check(state); triggers::process_pending_triggers(state);
    Ok(())
}

#[cfg(test)]
mod tests;
