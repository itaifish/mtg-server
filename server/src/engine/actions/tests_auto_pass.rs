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
