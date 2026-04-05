use rand::seq::SliceRandom;

use crate::game::card::ObjectId;
use crate::game::state::{GameState, GameStatus};
use crate::game::zone::ZoneType;

use super::{validate_player, ActionError};

/// CR 103.1 — The chosen player picks who goes first.
/// Turn order is the lobby join order, rotated so the chosen player starts.
pub fn choose_first_player(
    state: &mut GameState,
    player_id: &str,
    first_player_id: &str,
) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if state.status != GameStatus::ChoosingPlayOrder {
        return Err(ActionError::Illegal(
            "not in choosing play order phase".into(),
        ));
    }

    if state.play_order_chooser.as_deref() != Some(player_id) {
        return Err(ActionError::Illegal(
            "you are not the play order chooser".into(),
        ));
    }

    if !state.has_player(first_player_id) {
        return Err(ActionError::Illegal("chosen player not in game".into()));
    }

    // Rotate living_turn_order so first_player_id is at index 0
    let first_idx = state
        .living_turn_order
        .iter()
        .position(|id| id == first_player_id)
        .ok_or_else(|| ActionError::Illegal("chosen player not in game".into()))?;
    state.living_turn_order.rotate_left(first_idx);
    state.starting_turn_order = state.living_turn_order.clone();
    state.active_player_index = 0;
    state.priority_index = 0;

    // Transition to mulligans — draw opening hands
    state.status = GameStatus::ResolvingMulligans;
    for player_id in state.living_turn_order.clone() {
        for _ in 0..7 {
            state.draw_card(&player_id);
        }
    }

    state.record_action();
    Ok(())
}

/// CR 103.5 — London mulligan: shuffle hand back, draw 7 again.
pub fn mulligan(state: &mut GameState, player_id: &str) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if state.status != GameStatus::ResolvingMulligans {
        return Err(ActionError::Illegal("not in mulligan phase".into()));
    }

    let player = state
        .get_player_mut(player_id)
        .ok_or_else(|| ActionError::Illegal("player not found".into()))?;

    if player.pregame.has_kept {
        return Err(ActionError::Illegal("already kept hand".into()));
    }

    player.pregame.mulligan_count += 1;

    // Move hand back to library
    let zones = state.player_zones.get_mut(player_id).unwrap();
    let hand_cards: Vec<ObjectId> = zones.hand.drain().collect();
    zones.library.extend(hand_cards);

    // Shuffle library
    zones.library.shuffle(&mut state.rng);

    // Draw 7 new cards
    for _ in 0..7 {
        state.draw_card(player_id);
    }

    state.record_action();
    Ok(())
}

/// CR 103.5 — Keep hand. If mulligan_count > 0, must put that many cards
/// on the bottom of library.
pub fn keep_hand(
    state: &mut GameState,
    player_id: &str,
    cards_to_bottom: &[ObjectId],
) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if state.status != GameStatus::ResolvingMulligans {
        return Err(ActionError::Illegal("not in mulligan phase".into()));
    }

    let mulligan_count = state
        .get_player(player_id)
        .ok_or_else(|| ActionError::Illegal("player not found".into()))?
        .pregame
        .mulligan_count;

    if cards_to_bottom.len() != mulligan_count as usize {
        return Err(ActionError::Illegal(format!(
            "must put exactly {} cards on bottom",
            mulligan_count
        )));
    }

    // Validate all cards are in hand
    for &card_id in cards_to_bottom {
        if !state.is_in_hand(player_id, card_id) {
            return Err(ActionError::Illegal("card is not in your hand".into()));
        }
    }

    // Move cards to bottom of library
    for &card_id in cards_to_bottom {
        let zones = state.player_zones.get_mut(player_id).unwrap();
        zones.hand.remove(&card_id);
        zones.library.insert(0, card_id);
    }

    state.get_player_mut(player_id).unwrap().pregame.has_kept = true;

    // If all players have kept, start the game
    if state.players.iter().all(|p| p.pregame.has_kept) {
        state.status = GameStatus::InProgress;
        state.turn_number = 1;
    }

    state.record_action();
    Ok(())
}

#[cfg(test)]
mod tests;
