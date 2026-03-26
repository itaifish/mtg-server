use super::*;
use crate::game::card::{CardDefinition, CardInstance, CardType};
use crate::game::mana::Color;
use crate::game::state::tests_helper::two_player_game;

fn make_creature(id: u64, owner: &str, power: i32, toughness: i32) -> CardInstance {
    CardInstance {
        id,
        owner: owner.into(),
        controller: Some(owner.into()),
        definition: CardDefinition {
            name: format!("Creature {}", id),
            mana_cost: None,
            colors: vec![Color::Green],
            card_types: vec![CardType::Creature],
            subtypes: vec![],
            supertypes: vec![],
            power: Some(power),
            toughness: Some(toughness),
            loyalty: None,
            defense: None,
            rules_text: String::new(),
            abilities: vec![],
        },
        tapped: false,
        damage_marked: 0,
        counters: vec![],
        protector: None,
    }
}

fn setup_combat(state: &mut GameState) {
    state.phase = Phase::Combat(CombatStep::DeclareAttackers);
    // Alice has a 3/3, Bob has a 2/2
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

    state.phase = Phase::Combat(CombatStep::CombatDamage);

    resolve_combat_damage(&mut state).unwrap();

    assert_eq!(state.get_player("bob").unwrap().life_total, 17); // 20 - 3
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
    resolve_combat_damage(&mut state).unwrap();

    // 3/3 attacker takes 2 damage from 2/2 blocker
    assert_eq!(state.objects.get(&10).unwrap().damage_marked, 2);
    // 2/2 blocker takes 3 damage from 3/3 attacker
    assert_eq!(state.objects.get(&20).unwrap().damage_marked, 3);
    // Bob takes no damage (attacker was blocked)
    assert_eq!(state.get_player("bob").unwrap().life_total, 20);
}
