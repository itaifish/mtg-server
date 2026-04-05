use super::*;

pub fn two_player_game() -> GameState {
    let mut state = GameState::new(
        "game1",
        "Test Game",
        vec![Player::new("alice", "Alice"), Player::new("bob", "Bob")],
        42,
    );
    state.status = GameStatus::InProgress;
    state.turn_number = 1;
    state
}
