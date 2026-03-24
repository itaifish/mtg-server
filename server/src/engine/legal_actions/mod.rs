use crate::game::card::CardType;
use crate::game::state::GameState;

use super::actions::can_play_at_sorcery_speed;

/// A legal action a player can take.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LegalAction {
    PassPriority,
    PlayLand { object_id: u64 },
    Concede,
}

/// Compute all legal actions for a player in the current game state.
pub fn for_player(state: &GameState, player_id: &str) -> Vec<LegalAction> {
    let mut actions = vec![];

    // Everyone can always concede
    actions.push(LegalAction::Concede);

    // CR 117.1 — Only the player with priority can take actions
    if !state.has_priority(player_id) {
        return actions;
    }

    // Can always pass priority
    actions.push(LegalAction::PassPriority);

    // CR 305 — Can play a land at sorcery speed if haven't exceeded limit
    // TODO: account for effects that increase the land-per-turn limit
    // TODO: check all zones the player is allowed to play lands from
    if can_play_at_sorcery_speed(state, player_id) && state.lands_played_this_turn < 1 {
        if let Some(zones) = state.player_zones.get(player_id) {
            for &obj_id in &zones.hand {
                if let Some(card) = state.objects.get(&obj_id) {
                    if card.definition.card_types.contains(&CardType::Land) {
                        actions.push(LegalAction::PlayLand { object_id: obj_id });
                    }
                }
            }
        }
    }

    actions
}

#[cfg(test)]
mod tests;
