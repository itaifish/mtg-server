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

#[test]
fn declare_attackers_offered_only_before_attackers_declared() {
    use crate::game::state::{AttackTarget, AttackerInfo, CombatState};
    use std::collections::HashSet;

    let mut state = two_player_game();
    let active = state.active_player().id.clone();
    state.phase = Phase::Combat(CombatStep::DeclareAttackers);

    // Before attackers are declared (combat is None), it's a legal action.
    let actions = for_player(&state, &active);
    assert!(
        actions.contains(&LegalAction::DeclareAttackers),
        "DeclareAttackers should be offered before attackers are declared"
    );

    // After attackers are declared (combat is Some), it must NOT be offered again.
    state.combat = Some(CombatState {
        attackers: vec![AttackerInfo {
            object_id: 1,
            target: AttackTarget::Player("bob".into()),
        }],
        blockers: vec![],
        blockers_declared: false,
        dealt_first_strike: HashSet::new(),
    });
    let actions = for_player(&state, &active);
    assert!(
        !actions.contains(&LegalAction::DeclareAttackers),
        "DeclareAttackers should NOT be offered after attackers are declared"
    );
}

#[test]
fn declare_blockers_offered_only_before_blockers_declared() {
    use crate::game::state::{AttackTarget, AttackerInfo, CombatState};
    use std::collections::HashSet;

    let mut state = two_player_game();
    state.phase = Phase::Combat(CombatStep::DeclareBlockers);
    state.combat = Some(CombatState {
        attackers: vec![AttackerInfo {
            object_id: 1,
            target: AttackTarget::Player("bob".into()),
        }],
        blockers: vec![],
        blockers_declared: false,
        dealt_first_strike: HashSet::new(),
    });

    // Bob is the defending player and hasn't declared blockers yet.
    let actions = for_player(&state, "bob");
    assert!(
        actions.contains(&LegalAction::DeclareBlockers),
        "DeclareBlockers should be offered before blockers are declared"
    );

    // After declaring blockers (even zero), it must not be offered again.
    state.combat.as_mut().unwrap().blockers_declared = true;
    let actions = for_player(&state, "bob");
    assert!(
        !actions.contains(&LegalAction::DeclareBlockers),
        "DeclareBlockers should NOT be offered after blockers are declared"
    );
}
