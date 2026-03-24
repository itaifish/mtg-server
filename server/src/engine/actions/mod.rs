use crate::game::card::CardType;
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

/// Pass priority. CR 117.4 — If all players pass in succession, the top
/// object on the stack resolves, or the phase/step ends.
/// For now this is simplified: passing advances the phase.
pub fn pass_priority(state: &mut GameState, player_id: &str) -> Result<(), ActionError> {
    validate_player(state, player_id)?;
    state.record_action();

    if let Some(next) = state.phase.next() {
        state.phase = next;
    } else {
        state.advance_turn();
    }

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

    // TODO: check all zones the player is allowed to play lands from,
    // not just hand (e.g., Crucible of Worlds, Ramunap Excavator)
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

    state.move_object(object_id, ZoneType::Battlefield, None);
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
