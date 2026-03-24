use super::*;
use crate::game::state::tests_helper::two_player_game;

#[test]
fn pass_priority_advances_phase() {
    let mut state = two_player_game();
    let player_id = state.active_player().id.clone();
    let old_phase = state.phase;
    pass_priority(&mut state, &player_id).unwrap();
    assert_ne!(state.phase, old_phase);
    assert_eq!(state.action_count, 1);
}

#[test]
fn concede_eliminates_player() {
    let mut state = two_player_game();
    concede(&mut state, "alice").unwrap();
    assert!(
        state
            .players
            .iter()
            .find(|p| p.id == "alice")
            .unwrap()
            .has_lost
    );
    assert_eq!(state.status, GameStatus::Finished);
}

#[test]
fn concede_unknown_player_errors() {
    let mut state = two_player_game();
    let result = concede(&mut state, "nobody");
    assert!(matches!(result, Err(ActionError::PlayerNotFound(_))));
}
