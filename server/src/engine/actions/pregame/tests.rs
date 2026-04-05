use super::*;
use crate::deck::loader::{load_deck, DeckEntry};
use crate::game::state::{GameState, GameStatus, Player};

fn setup_game() -> GameState {
    let mut state = GameState::new(
        "test",
        "Test Game",
        vec![Player::new("alice", "Alice"), Player::new("bob", "Bob")],
        42,
    );

    let deck = vec![
        DeckEntry {
            card_name: "Forest".into(),
            count: 17,
        },
        DeckEntry {
            card_name: "Grizzly Bears".into(),
            count: 13,
        },
    ];
    load_deck(&mut state, "alice", &deck).unwrap();
    load_deck(&mut state, "bob", &deck).unwrap();

    state
}

#[test]
fn choose_first_player_sets_turn_order() {
    let mut state = setup_game();
    state.status = GameStatus::ChoosingPlayOrder;
    state.play_order_chooser = Some("alice".into());

    choose_first_player(&mut state, "alice", "bob").unwrap();

    assert_eq!(state.status, GameStatus::ResolvingMulligans);
    assert_eq!(state.active_player().id, "bob");
    // Both players should have 7 cards in hand
    assert_eq!(state.player_zones["alice"].hand.len(), 7);
    assert_eq!(state.player_zones["bob"].hand.len(), 7);
}

#[test]
fn wrong_chooser_is_rejected() {
    let mut state = setup_game();
    state.status = GameStatus::ChoosingPlayOrder;
    state.play_order_chooser = Some("alice".into());

    let result = choose_first_player(&mut state, "bob", "bob");
    assert!(result.is_err());
}

#[test]
fn mulligan_reshuffles_and_redraws() {
    let mut state = setup_game();
    state.status = GameStatus::ChoosingPlayOrder;
    state.play_order_chooser = Some("alice".into());
    choose_first_player(&mut state, "alice", "alice").unwrap();

    mulligan(&mut state, "alice").unwrap();

    assert_eq!(state.player_zones["alice"].hand.len(), 7);
    assert_eq!(state.get_player("alice").unwrap().pregame.mulligan_count, 1);
}

#[test]
fn keep_hand_requires_correct_bottom_count() {
    let mut state = setup_game();
    state.status = GameStatus::ChoosingPlayOrder;
    state.play_order_chooser = Some("alice".into());
    choose_first_player(&mut state, "alice", "alice").unwrap();

    // Mulligan once, then keep — must put 1 card on bottom
    mulligan(&mut state, "alice").unwrap();

    let result = keep_hand(&mut state, "alice", &[]);
    assert!(result.is_err());

    let card = *state.player_zones["alice"].hand.iter().next().unwrap();
    keep_hand(&mut state, "alice", &[card]).unwrap();

    assert_eq!(state.player_zones["alice"].hand.len(), 6);
    assert!(state.get_player("alice").unwrap().pregame.has_kept);
}

#[test]
fn game_starts_when_all_keep() {
    let mut state = setup_game();
    state.status = GameStatus::ChoosingPlayOrder;
    state.play_order_chooser = Some("alice".into());
    choose_first_player(&mut state, "alice", "alice").unwrap();

    keep_hand(&mut state, "alice", &[]).unwrap();
    keep_hand(&mut state, "bob", &[]).unwrap();

    assert_eq!(state.status, GameStatus::InProgress);
    assert_eq!(state.turn_number, 1);
}
