use super::*;
use crate::game::state::tests_helper::two_player_game;

#[test]
fn non_active_player_can_only_concede() {
    let state = two_player_game();
    let non_active = "bob";
    let actions = for_player(&state, non_active);
    assert_eq!(actions, vec![LegalAction::Concede]);
}

#[test]
fn active_player_can_pass_and_concede() {
    let state = two_player_game();
    let active = state.active_player().id.clone();
    let actions = for_player(&state, &active);
    assert!(actions.contains(&LegalAction::Concede));
    assert!(actions.contains(&LegalAction::PassPriority));
}
