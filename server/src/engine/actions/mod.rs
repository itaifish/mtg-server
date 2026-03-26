use crate::game::ability::{all_abilities, AbilityCost, AbilityEffect};
use crate::game::card::CardType;
use crate::game::mana::{ManaType, SymbolPayment};
use crate::game::phases_and_steps::Phase;
use crate::game::state::{GameState, GameStatus};
use crate::game::zone::ZoneType;

use super::state_based;

/// Errors from action execution.
#[derive(Debug, thiserror::Error)]
pub enum ActionError {
    #[error("player {0} not found")]
    PlayerNotFound(String),
    #[error("{0}")]
    Illegal(String),
}

/// CR 307.1 / 505.1 — A player can take sorcery-speed actions only during
/// their main phase, when the stack is empty, and they have priority.
pub fn can_play_at_sorcery_speed(state: &GameState, player_id: &str) -> bool {
    let is_main = matches!(state.phase, Phase::PrecombatMain | Phase::PostcombatMain);
    is_main && state.stack.is_empty() && state.has_priority(player_id)
}

/// Pass priority. CR 117.4
///
/// Simplified for now: if the stack is empty and it's the active player
/// passing, advance the phase (and empty mana pools on transition).
/// TODO: track priority passing per player; only advance when all pass
/// in succession. Resolve top of stack when all pass with a non-empty stack.
pub fn pass_priority(state: &mut GameState, player_id: &str) -> Result<(), ActionError> {
    validate_player(state, player_id)?;
    state.record_action();

    // Only advance phase/turn when stack is empty
    if state.stack.is_empty() && state.has_priority(player_id) {
        // CR 106.4 — Mana pools empty on phase/step transitions
        state.empty_mana_pools();
        if let Some(next) = state.phase.next() {
            state.phase = next;
        } else {
            state.advance_turn();
        }
    }
    // TODO: when stack is non-empty and all players pass, resolve top of stack

    state_based::check(state);
    Ok(())
}

/// Activate a mana ability on a permanent. CR 605 — Mana abilities don't
/// use the stack and resolve immediately.
pub fn activate_mana_ability(
    state: &mut GameState,
    player_id: &str,
    object_id: u64,
    ability_index: usize,
) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if !state.battlefield.contains(&object_id) {
        return Err(ActionError::Illegal(
            "object is not on the battlefield".into(),
        ));
    }

    let card = state
        .objects
        .get(&object_id)
        .ok_or_else(|| ActionError::Illegal("object not found".into()))?;

    if card.controller.as_deref() != Some(player_id) {
        return Err(ActionError::Illegal(
            "you don't control this permanent".into(),
        ));
    }

    let abilities = all_abilities(&card.definition);
    let ability = abilities
        .get(ability_index)
        .ok_or_else(|| ActionError::Illegal("invalid ability index".into()))?
        .clone();

    if !ability.is_mana_ability {
        return Err(ActionError::Illegal("not a mana ability".into()));
    }

    // Validate costs before paying any
    for cost in &ability.costs {
        match cost {
            AbilityCost::TapSelf => {
                let card = state
                    .objects
                    .get(&object_id)
                    .ok_or_else(|| ActionError::Illegal("object not found".into()))?;
                if card.tapped {
                    return Err(ActionError::Illegal("permanent is already tapped".into()));
                }
                // CR 302.6 / 502.1 — Creatures can't tap unless they've been
                // under your control since the start of your most recent turn
                // (summoning sickness), unless they have haste.
                // TODO: track "entered battlefield this turn" and haste
                if card.definition.card_types.contains(&CardType::Creature) {
                    // For now, allow it — summoning sickness tracking comes later
                }
            }
            _ => return Err(ActionError::Illegal("unsupported ability cost".into())),
        }
    }

    // Pay costs
    for cost in &ability.costs {
        #[allow(clippy::single_match)]
        match cost {
            AbilityCost::TapSelf => {
                let card = state
                    .objects
                    .get_mut(&object_id)
                    .ok_or_else(|| ActionError::Illegal("object not found".into()))?;
                card.tapped = true;
            }
            _ => {}
        }
    }

    // Resolve effect
    // TODO: replacement effects on mana production
    // TODO: triggered abilities on mana production
    match &ability.effect {
        AbilityEffect::AddMana(productions) => {
            for prod in productions {
                match &prod.restriction {
                    None => state.add_mana(player_id, prod.mana_type, prod.amount),
                    Some(r) => {
                        state.add_mana_restricted(player_id, prod.mana_type, prod.amount, r.clone())
                    }
                }
            }
        }
        _ => return Err(ActionError::Illegal("unsupported ability effect".into())),
    }

    state.record_action();
    Ok(())
}

/// Cast a spell. CR 601
///
/// Simplified for now: spells resolve immediately (no stack interaction).
/// TODO: put spell on stack, allow responses, then resolve
/// TODO: targets, modal choices, X costs, additional costs
pub fn cast_spell(
    state: &mut GameState,
    player_id: &str,
    object_id: u64,
    mana_payment: &[SymbolPayment],
) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if !state.is_in_hand(player_id, object_id) {
        return Err(ActionError::Illegal("card is not in your hand".into()));
    }

    let card = state
        .objects
        .get(&object_id)
        .ok_or_else(|| ActionError::Illegal("object not found".into()))?;

    let card_types = card.definition.card_types.clone();
    let mana_cost = card
        .definition
        .mana_cost
        .clone()
        .ok_or_else(|| ActionError::Illegal("card has no mana cost".into()))?;

    // CR 304.1 — Instants can be cast anytime you have priority
    // CR 307.1 / 302.1 — Everything else is sorcery speed
    let is_instant = card_types.contains(&CardType::Instant);
    if !is_instant && !can_play_at_sorcery_speed(state, player_id) {
        return Err(ActionError::Illegal(
            "can only cast this spell at sorcery speed".into(),
        ));
    }
    if is_instant && !state.has_priority(player_id) {
        return Err(ActionError::Illegal("you don't have priority".into()));
    }

    // Pay mana cost
    let player = state
        .get_player_mut(player_id)
        .ok_or_else(|| ActionError::Illegal("player not found".into()))?;

    player
        .mana_pool
        .try_pay(&mana_cost, mana_payment)
        .map_err(|e| ActionError::Illegal(e.to_string()))?;

    // Resolve immediately (simplified — no stack)
    // TODO: put on stack, allow responses, then resolve
    if card_types.iter().any(|t| t.is_permanent()) {
        state.move_object(object_id, ZoneType::Battlefield);
    } else {
        // TODO: resolve the spell's effect before sending to graveyard
        state.send_to_graveyard(object_id);
    }

    state.record_action();
    state_based::check(state);
    Ok(())
}

/// Play a land. CR 305.1
///
/// TODO: Some cards modify the number of lands a player can play per turn
/// (e.g., Exploration, Azusa, Lost but Seeking). This will need a
/// `lands_allowed_this_turn` field or continuous effect system.
///
/// TODO: Some cards allow playing lands from zones other than the hand
/// (e.g., Crucible of Worlds for graveyard, Vivien for exile). This will
/// need a check against all zones the player is allowed to play from.
pub fn play_land(
    state: &mut GameState,
    player_id: &str,
    object_id: u64,
) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if !can_play_at_sorcery_speed(state, player_id) {
        return Err(ActionError::Illegal(
            "can only play lands at sorcery speed".into(),
        ));
    }

    // CR 305.2 — One land per turn (base rule)
    // TODO: account for effects that increase this limit
    if state.lands_played_this_turn >= 1 {
        return Err(ActionError::Illegal(
            "already played a land this turn".into(),
        ));
    }

    // TODO: check all zones the player is allowed to play lands from
    if !state.is_in_hand(player_id, object_id) {
        return Err(ActionError::Illegal("card is not in your hand".into()));
    }

    let is_land = state
        .objects
        .get(&object_id)
        .map(|c| c.definition.card_types.contains(&CardType::Land))
        .unwrap_or(false);

    if !is_land {
        return Err(ActionError::Illegal("card is not a land".into()));
    }

    state.move_object(object_id, ZoneType::Battlefield);
    state.lands_played_this_turn += 1;
    state.record_action();

    state_based::check(state);
    Ok(())
}

/// Concede the game.
pub fn concede(state: &mut GameState, player_id: &str) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    state.eliminate_player(player_id);
    state.record_action();

    if state.alive_count() <= 1 {
        state.status = GameStatus::Finished;
    }

    state_based::check(state);
    Ok(())
}

fn validate_player(state: &GameState, player_id: &str) -> Result<(), ActionError> {
    if !state.has_player(player_id) {
        return Err(ActionError::PlayerNotFound(player_id.to_string()));
    }
    Ok(())
}

#[cfg(test)]
mod tests;
