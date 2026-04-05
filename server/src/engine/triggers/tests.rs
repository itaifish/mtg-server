use super::*;
use crate::game::effect::{Effect, PlayerSpec, Value};
use crate::game::event::PendingTrigger;
use crate::game::state::{GameState, Player};

fn two_player_game() -> GameState {
    let mut state = GameState::new("test", vec![Player::new("alice", "Alice"), Player::new("bob", "Bob")], 42);
    state.status = crate::game::state::GameStatus::InProgress;
    state
}

#[test]
fn identical_triggers_dont_need_ordering() {
    let triggers = vec![
        PendingTrigger {
            source_id: 1,
            controller: "alice".into(),
            effect: Effect::GainLife { amount: Value::Constant(1), player: PlayerSpec::Controller },
            needs_targets: false,
            description: "gain 1 life".into(),
        },
        PendingTrigger {
            source_id: 2,
            controller: "alice".into(),
            effect: Effect::GainLife { amount: Value::Constant(1), player: PlayerSpec::Controller },
            needs_targets: false,
            description: "gain 1 life".into(),
        },
    ];
    assert!(!needs_ordering(&triggers));
}

#[test]
fn different_triggers_need_ordering() {
    let triggers = vec![
        PendingTrigger {
            source_id: 1,
            controller: "alice".into(),
            effect: Effect::GainLife { amount: Value::Constant(1), player: PlayerSpec::Controller },
            needs_targets: false,
            description: "gain 1 life".into(),
        },
        PendingTrigger {
            source_id: 2,
            controller: "alice".into(),
            effect: Effect::DrawCards { count: Value::Constant(1), player: PlayerSpec::Controller },
            needs_targets: false,
            description: "draw 1 card".into(),
        },
    ];
    assert!(needs_ordering(&triggers));
}

#[test]
fn process_puts_triggers_on_stack() {
    let mut state = two_player_game();
    state.pending_triggers.push(PendingTrigger {
        source_id: 10,
        controller: "alice".into(),
        effect: Effect::GainLife { amount: Value::Constant(1), player: PlayerSpec::Controller },
        needs_targets: false,
        description: "gain 1 life".into(),
    });

    process_pending_triggers(&mut state);

    assert!(state.pending_triggers.is_empty());
    assert!(!state.stack.is_empty());
}
