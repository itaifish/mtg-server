use super::*;
use crate::game::card::{CardDefinition, CardInstance, CardType};
use crate::game::mana::Color;
use crate::game::state::tests_helper::two_player_game;

fn make_creature(id: u64, owner: &str, power: i32, toughness: i32) -> CardInstance {
    let mut card = CardInstance::new(
        id,
        owner,
        CardDefinition {
            name: format!("Creature {}", id),
            colors: vec![Color::Green],
            card_types: vec![CardType::Creature],
            power: Some(power),
            toughness: Some(toughness),
            ..Default::default()
        },
    );
    card.summoning_sick = false;
    card
}

fn setup_combat(state: &mut GameState) {
    state.phase = Phase::Combat(CombatStep::DeclareAttackers);
    let attacker = make_creature(10, "alice", 3, 3);
    let blocker = make_creature(20, "bob", 2, 2);
    state.objects.insert(10, attacker);
    state.objects.insert(20, blocker);
    state.battlefield.insert(10);
    state.battlefield.insert(20);
}

#[test]
fn declare_attackers_taps_creatures() {
    let mut state = two_player_game();
    setup_combat(&mut state);

    declare_attackers(
        &mut state,
        "alice",
        vec![AttackerInfo {
            object_id: 10,
            target: AttackTarget::Player("bob".into()),
        }],
    )
    .unwrap();

    assert!(state.objects.get(&10).unwrap().tapped);
    assert!(state.combat.is_some());
}

#[test]
fn declare_attackers_wrong_phase_fails() {
    let mut state = two_player_game();
    state.phase = Phase::PrecombatMain;

    let result = declare_attackers(&mut state, "alice", vec![]);
    assert!(result.is_err());
}

#[test]
fn declare_blockers_assigns_correctly() {
    let mut state = two_player_game();
    setup_combat(&mut state);

    declare_attackers(
        &mut state,
        "alice",
        vec![AttackerInfo {
            object_id: 10,
            target: AttackTarget::Player("bob".into()),
        }],
    )
    .unwrap();

    state.phase = Phase::Combat(CombatStep::DeclareBlockers);

    declare_blockers(
        &mut state,
        "bob",
        vec![BlockerInfo {
            object_id: 20,
            blocking: 10,
        }],
    )
    .unwrap();

    let combat = state.combat.as_ref().unwrap();
    assert_eq!(combat.blockers.len(), 1);
    assert_eq!(combat.blockers[0].blocking, 10);
}

#[test]
fn unblocked_attacker_deals_damage_to_player() {
    let mut state = two_player_game();
    setup_combat(&mut state);

    declare_attackers(
        &mut state,
        "alice",
        vec![AttackerInfo {
            object_id: 10,
            target: AttackTarget::Player("bob".into()),
        }],
    )
    .unwrap();

    // Advance to combat damage — deal_combat_damage runs via on_phase_enter
    state.phase = Phase::Combat(CombatStep::CombatDamage);
    state.deal_combat_damage_for_test();

    assert_eq!(state.get_player("bob").unwrap().life_total, 17);
}

#[test]
fn blocked_attacker_and_blocker_deal_damage_to_each_other() {
    let mut state = two_player_game();
    setup_combat(&mut state);

    declare_attackers(
        &mut state,
        "alice",
        vec![AttackerInfo {
            object_id: 10,
            target: AttackTarget::Player("bob".into()),
        }],
    )
    .unwrap();

    state.phase = Phase::Combat(CombatStep::DeclareBlockers);
    declare_blockers(
        &mut state,
        "bob",
        vec![BlockerInfo {
            object_id: 20,
            blocking: 10,
        }],
    )
    .unwrap();

    state.phase = Phase::Combat(CombatStep::CombatDamage);
    state.deal_combat_damage_for_test();

    assert_eq!(state.objects.get(&10).unwrap().damage_marked, 2);
    assert_eq!(state.objects.get(&20).unwrap().damage_marked, 3);
    assert_eq!(state.get_player("bob").unwrap().life_total, 20);
}
