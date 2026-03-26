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

use crate::game::card::{CardDefinition, CardInstance, CardType};
use crate::game::mana::Color;

fn make_creature(id: u64, owner: &str, power: i32, toughness: i32) -> CardInstance {
    CardInstance {
        id,
        owner: owner.into(),
        controller: Some(owner.into()),
        definition: CardDefinition {
            name: "Test".into(),
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

#[test]
fn lethal_damage_sends_creature_to_graveyard() {
    let mut state = two_player_game();
    let mut creature = make_creature(1, "alice", 2, 3);
    creature.damage_marked = 3;
    state.objects.insert(1, creature);
    state.battlefield.insert(1);

    check(&mut state);

    assert!(!state.battlefield.contains(&1));
    assert!(state.player_zones["alice"].graveyard.contains(&1));
}

#[test]
fn zero_toughness_sends_creature_to_graveyard() {
    let mut state = two_player_game();
    let creature = make_creature(1, "alice", 2, 0);
    state.objects.insert(1, creature);
    state.battlefield.insert(1);

    check(&mut state);

    assert!(!state.battlefield.contains(&1));
    assert!(state.player_zones["alice"].graveyard.contains(&1));
}

#[test]
fn undamaged_creature_stays_on_battlefield() {
    let mut state = two_player_game();
    let creature = make_creature(1, "alice", 2, 3);
    state.objects.insert(1, creature);
    state.battlefield.insert(1);

    check(&mut state);

    assert!(state.battlefield.contains(&1));
}
