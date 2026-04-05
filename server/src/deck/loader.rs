use rand::seq::SliceRandom;

use crate::cards::card_by_name;
use crate::game::card::CardInstance;
use crate::game::state::GameState;

/// A decklist entry from the client.
pub struct DeckEntry {
    pub card_name: String,
    pub count: u32,
}

/// Load a decklist into a game for a player. Creates CardInstances,
/// puts them in the player's library, and shuffles.
pub fn load_deck(
    state: &mut GameState,
    player_id: &str,
    entries: &[DeckEntry],
) -> Result<(), String> {
    for entry in entries {
        let definition = card_by_name(&entry.card_name)
            .ok_or_else(|| format!("unknown card: {}", entry.card_name))?
            .clone();

        for _ in 0..entry.count {
            let id = state.new_object_id();
            let instance = CardInstance::new(id, player_id, definition.clone());
            state.objects.insert(id, instance);
            if let Some(zones) = state.player_zones.get_mut(player_id) {
                zones.library.push(id);
            }
        }
    }

    // Shuffle library with the game's deterministic RNG
    if let Some(zones) = state.player_zones.get_mut(player_id) {
        zones.library.shuffle(&mut state.rng);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::state::Player;

    fn test_game() -> GameState {
        GameState::new("test", "Test Game", vec![Player::new("alice", "Alice")], 42)
    }

    #[test]
    fn load_deck_creates_cards_in_library() {
        let mut state = test_game();
        let entries = vec![
            DeckEntry {
                card_name: "Forest".into(),
                count: 10,
            },
            DeckEntry {
                card_name: "Grizzly Bears".into(),
                count: 4,
            },
        ];
        load_deck(&mut state, "alice", &entries).unwrap();

        assert_eq!(state.player_zones["alice"].library.len(), 14);
        assert_eq!(state.objects.len(), 14);
    }

    #[test]
    fn load_deck_unknown_card_errors() {
        let mut state = test_game();
        let entries = vec![DeckEntry {
            card_name: "Nonexistent Card".into(),
            count: 1,
        }];
        assert!(load_deck(&mut state, "alice", &entries).is_err());
    }

    #[test]
    fn different_players_get_different_shuffles() {
        let mut state = GameState::new(
            "test",
            "Test Game",
            vec![Player::new("alice", "Alice"), Player::new("bob", "Bob")],
            42,
        );
        let entries = vec![
            DeckEntry {
                card_name: "Forest".into(),
                count: 5,
            },
            DeckEntry {
                card_name: "Grizzly Bears".into(),
                count: 5,
            },
        ];
        load_deck(&mut state, "alice", &entries).unwrap();
        load_deck(&mut state, "bob", &entries).unwrap();

        let alice_lib = &state.player_zones["alice"].library;
        let bob_lib = &state.player_zones["bob"].library;
        // Different object IDs, and RNG advanced between shuffles
        assert_ne!(
            alice_lib
                .iter()
                .map(|id| state.objects[id].definition.name.clone())
                .collect::<Vec<_>>(),
            bob_lib
                .iter()
                .map(|id| state.objects[id].definition.name.clone())
                .collect::<Vec<_>>(),
        );
    }
}
