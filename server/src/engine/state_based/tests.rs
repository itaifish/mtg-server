use super::*;
use crate::game::state::tests_helper::two_player_game;

#[test]
fn zero_life_marks_player_lost() {
    let mut state = two_player_game();
    state.players[0].life_total = 0;
    check(&mut state);
    assert!(state.players[0].has_lost);
    assert_eq!(state.status, GameStatus::Finished);
}

#[test]
fn ten_poison_marks_player_lost() {
    let mut state = two_player_game();
    state.players[0].poison_counters = 10;
    check(&mut state);
    assert!(state.players[0].has_lost);
}

#[test]
fn healthy_players_unaffected() {
    let mut state = two_player_game();
    check(&mut state);
    assert!(!state.players[0].has_lost);
    assert!(!state.players[1].has_lost);
}
