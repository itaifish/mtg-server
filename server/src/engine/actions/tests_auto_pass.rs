use crate::engine::actions::{pass_priority, set_auto_pass};
use crate::game::phases_and_steps::{BeginningStep, CombatStep, Phase};
use crate::game::state::{AutoPassMode, GameStatus};
use crate::game::state::tests_helper::two_player_game;

fn in_progress_game() -> crate::game::state::GameState {
    let mut state = two_player_game();
    state.status = GameStatus::InProgress;
    state.turn_number = 1;
    state.phase = Phase::Beginning(BeginningStep::Untap);
    state
}

#[test]
fn auto_pass_until_phase_skips_intermediate_phases() {
    let mut state = in_progress_game();

    set_auto_pass(&mut state, "alice", AutoPassMode::UntilPhase(Phase::PrecombatMain)).unwrap();
    set_auto_pass(&mut state, "bob", AutoPassMode::UntilPhase(Phase::PrecombatMain)).unwrap();

    assert_eq!(state.phase, Phase::PrecombatMain);

    // Priority player's auto-pass is cleared immediately
    let priority_id = state.priority_player().id.clone();
    assert_eq!(state.get_player(&priority_id).unwrap().auto_pass, AutoPassMode::None);

    // Other player's auto-pass clears once they get priority
    let other_id = if priority_id == "alice" { "bob" } else { "alice" };
    pass_priority(&mut state, &priority_id).unwrap();
    assert_eq!(state.get_player(other_id).unwrap().auto_pass, AutoPassMode::None);
}

#[test]
fn auto_pass_until_combat_step() {
    let mut state = in_progress_game();

    let target = Phase::Combat(CombatStep::DeclareAttackers);
    set_auto_pass(&mut state, "alice", AutoPassMode::UntilPhase(target)).unwrap();
    set_auto_pass(&mut state, "bob", AutoPassMode::UntilPhase(target)).unwrap();

    assert_eq!(state.phase, Phase::Combat(CombatStep::DeclareAttackers));
}

#[test]
fn auto_pass_until_stack_or_turn_advances_to_next_turn() {
    let mut state = in_progress_game();
    let turn = state.turn_number;

    set_auto_pass(&mut state, "alice", AutoPassMode::UntilStackOrTurn { set_on_turn: turn }).unwrap();
    set_auto_pass(&mut state, "bob", AutoPassMode::UntilStackOrTurn { set_on_turn: turn }).unwrap();

    assert!(state.turn_number > turn, "expected turn to advance, got {}", state.turn_number);

    // Priority player's auto-pass cleared
    let priority_id = state.priority_player().id.clone();
    assert_eq!(state.get_player(&priority_id).unwrap().auto_pass, AutoPassMode::None);

    // Other player clears after one more pass
    let other_id = if priority_id == "alice" { "bob" } else { "alice" };
    pass_priority(&mut state, &priority_id).unwrap();
    assert_eq!(state.get_player(other_id).unwrap().auto_pass, AutoPassMode::None);
}

#[test]
fn auto_pass_one_player_waits_for_other() {
    let mut state = in_progress_game();

    // Only alice auto-passes
    set_auto_pass(&mut state, "alice", AutoPassMode::UntilPhase(Phase::PrecombatMain)).unwrap();

    // Alice auto-passed, priority should be on bob
    assert_eq!(state.priority_player().id, "bob");

    // Bob manually passes — alice auto-passes again, phases advance
    for _ in 0..20 {
        if state.phase == Phase::PrecombatMain {
            break;
        }
        let pid = state.priority_player().id.clone();
        if pid == "bob" {
            pass_priority(&mut state, "bob").unwrap();
        }
    }

    assert_eq!(state.phase, Phase::PrecombatMain);
}

#[test]
fn set_auto_pass_immediately_passes_if_has_priority() {
    let mut state = in_progress_game();

    assert_eq!(state.priority_player().id, "alice");

    set_auto_pass(&mut state, "alice", AutoPassMode::UntilPhase(Phase::PrecombatMain)).unwrap();

    // Priority should now be on bob
    assert_eq!(state.priority_player().id, "bob");
}

#[test]
fn auto_pass_stops_exactly_at_target_phase() {
    // Both players auto-pass to postcombat main — should stop exactly there
    let mut state = in_progress_game();
    state.phase = Phase::PrecombatMain;

    set_auto_pass(&mut state, "alice", AutoPassMode::UntilPhase(Phase::PostcombatMain)).unwrap();
    set_auto_pass(&mut state, "bob", AutoPassMode::UntilPhase(Phase::PostcombatMain)).unwrap();

    assert_eq!(state.phase, Phase::PostcombatMain, "should stop at postcombat main, not skip past it");
}

#[test]
fn auto_pass_does_not_skip_target_phase_when_set_during_target() {
    // If we're already in the target phase, auto-pass should not pass at all
    let mut state = in_progress_game();
    state.phase = Phase::PrecombatMain;

    set_auto_pass(&mut state, "alice", AutoPassMode::UntilPhase(Phase::PrecombatMain)).unwrap();

    // Alice is already in precombat main — should_auto_pass returns false, so no pass
    assert_eq!(state.phase, Phase::PrecombatMain);
    assert_eq!(state.priority_player().id, "alice", "alice should still have priority");
    assert_eq!(state.get_player("alice").unwrap().auto_pass, AutoPassMode::None, "auto-pass should be cleared");
}

#[test]
fn auto_pass_alice_only_bob_manually_passes_each_step() {
    let mut state = in_progress_game();

    // Alice auto-passes to postcombat main, bob passes manually
    set_auto_pass(&mut state, "alice", AutoPassMode::UntilPhase(Phase::PostcombatMain)).unwrap();

    let mut phases_seen = vec![state.phase];

    for _ in 0..40 {
        if state.phase == Phase::PostcombatMain {
            break;
        }
        let pid = state.priority_player().id.clone();
        if pid == "bob" {
            pass_priority(&mut state, "bob").unwrap();
            if !phases_seen.contains(&state.phase) {
                phases_seen.push(state.phase);
            }
        }
    }

    assert_eq!(state.phase, Phase::PostcombatMain);
    // Should have passed through multiple phases
    assert!(phases_seen.len() > 1, "should have seen multiple phases: {:?}", phases_seen);
}

#[test]
fn auto_pass_both_to_different_phases() {
    // Alice auto-passes to precombat main, bob to postcombat main
    let mut state = in_progress_game();

    set_auto_pass(&mut state, "alice", AutoPassMode::UntilPhase(Phase::PrecombatMain)).unwrap();
    set_auto_pass(&mut state, "bob", AutoPassMode::UntilPhase(Phase::PostcombatMain)).unwrap();

    // Should reach precombat main (alice's target) — alice stops, bob keeps going
    assert_eq!(state.phase, Phase::PrecombatMain);

    // Alice's auto-pass should be cleared
    assert_eq!(state.get_player("alice").unwrap().auto_pass, AutoPassMode::None);

    // Bob should still have auto-pass set
    let bob_auto = &state.get_player("bob").unwrap().auto_pass;
    assert!(matches!(bob_auto, AutoPassMode::UntilPhase(Phase::PostcombatMain)));

    // Now alice manually passes — bob auto-passes, should advance
    pass_priority(&mut state, "alice").unwrap();

    // Keep going until postcombat main
    for _ in 0..20 {
        if state.phase == Phase::PostcombatMain {
            break;
        }
        let pid = state.priority_player().id.clone();
        if pid == "alice" {
            pass_priority(&mut state, "alice").unwrap();
        }
    }

    assert_eq!(state.phase, Phase::PostcombatMain);
}

#[test]
fn auto_pass_precombat_to_postcombat_traverses_combat() {
    // Verify we actually go through combat phases
    let mut state = in_progress_game();
    state.phase = Phase::PrecombatMain;

    set_auto_pass(&mut state, "alice", AutoPassMode::UntilPhase(Phase::PostcombatMain)).unwrap();
    set_auto_pass(&mut state, "bob", AutoPassMode::UntilPhase(Phase::PostcombatMain)).unwrap();

    assert_eq!(state.phase, Phase::PostcombatMain);
}

#[test]
fn auto_pass_one_until_end_of_turn_other_until_phase() {
    let mut state = in_progress_game();
    let turn = state.turn_number;

    // Alice passes until end of turn, bob passes until postcombat main
    set_auto_pass(
        &mut state,
        "alice",
        AutoPassMode::UntilStackOrTurn { set_on_turn: turn },
    )
    .unwrap();
    set_auto_pass(
        &mut state,
        "bob",
        AutoPassMode::UntilPhase(Phase::PostcombatMain),
    )
    .unwrap();

    // Should reach postcombat main (bob's stop)
    assert_eq!(state.phase, Phase::PostcombatMain);

    // Bob's auto-pass should be cleared
    let bob_ap = &state.get_player("bob").unwrap().auto_pass;
    assert_eq!(*bob_ap, AutoPassMode::None, "bob's auto-pass should be cleared at postcombat main");

    // Alice should still have auto-pass (her turn hasn't ended)
    let alice_ap = &state.get_player("alice").unwrap().auto_pass;
    assert!(
        matches!(alice_ap, AutoPassMode::UntilStackOrTurn { .. }),
        "alice should still be auto-passing, got {:?}",
        alice_ap
    );

    // Now bob manually passes each priority — alice auto-passes — should advance to next turn
    for _ in 0..30 {
        if state.turn_number > turn {
            break;
        }
        let pid = state.priority_player().id.clone();
        if pid == "bob" {
            pass_priority(&mut state, "bob").unwrap();
        }
    }

    assert!(state.turn_number > turn, "turn should have advanced");
    // Alice's auto-pass should now be cleared (turn changed)
    assert_eq!(
        state.get_player("alice").unwrap().auto_pass,
        AutoPassMode::None,
    );
}

#[test]
fn auto_pass_until_end_of_turn_both() {
    let mut state = in_progress_game();
    let turn = state.turn_number;

    set_auto_pass(
        &mut state,
        "alice",
        AutoPassMode::UntilStackOrTurn { set_on_turn: turn },
    )
    .unwrap();
    set_auto_pass(
        &mut state,
        "bob",
        AutoPassMode::UntilStackOrTurn { set_on_turn: turn },
    )
    .unwrap();

    assert!(state.turn_number > turn, "turn should have advanced");
}

#[test]
fn auto_pass_until_phase_does_not_overshoot() {
    // Set auto-pass to a specific phase, verify we stop exactly there
    // and the priority player is correct
    let mut state = in_progress_game();

    set_auto_pass(&mut state, "alice", AutoPassMode::UntilPhase(Phase::Combat(CombatStep::BeginningOfCombat))).unwrap();
    set_auto_pass(&mut state, "bob", AutoPassMode::UntilPhase(Phase::Combat(CombatStep::BeginningOfCombat))).unwrap();

    assert_eq!(
        state.phase,
        Phase::Combat(CombatStep::BeginningOfCombat),
        "should stop exactly at beginning of combat"
    );

    // Priority player should be the active player
    assert_eq!(state.priority_player().id, state.active_player().id);
}

#[test]
fn auto_pass_phase_click_advances_exactly_one_phase() {
    // Simulates: both players are in precombat main, alice clicks "combat"
    // to auto-pass to beginning of combat
    let mut state = in_progress_game();
    state.phase = Phase::PrecombatMain;

    // Alice clicks combat phase
    set_auto_pass(
        &mut state,
        "alice",
        AutoPassMode::UntilPhase(Phase::Combat(CombatStep::BeginningOfCombat)),
    )
    .unwrap();

    // Alice auto-passed, bob has priority
    assert_eq!(state.priority_player().id, "bob");
    // Still in precombat main — bob hasn't passed yet
    assert_eq!(state.phase, Phase::PrecombatMain);

    // Bob also clicks combat
    set_auto_pass(
        &mut state,
        "bob",
        AutoPassMode::UntilPhase(Phase::Combat(CombatStep::BeginningOfCombat)),
    )
    .unwrap();

    // Now both have auto-passed, should be at beginning of combat
    assert_eq!(state.phase, Phase::Combat(CombatStep::BeginningOfCombat));
}
