use super::*;
use super::tests_helper::two_player_game;
use crate::game::card::{CardDefinition, CardInstance, CardType};
use crate::game::mana::Color;
use crate::game::zone::ZoneType;

fn test_card(id: u64, owner: &str) -> CardInstance {
    CardInstance {
        id,
        owner: owner.into(),
        controller: Some(owner.into()),
        definition: CardDefinition {
            name: "Test Card".into(),
            mana_cost: None,
            colors: vec![Color::Red],
            card_types: vec![CardType::Creature],
            subtypes: vec![],
            supertypes: vec![],
            power: Some(2),
            toughness: Some(2),
            loyalty: None,
            defense: None,
            rules_text: String::new(),
        },
        tapped: false,
        damage_marked: 0,
        counters: vec![],
        protector: None,
    }
}

#[test]
fn active_player_returns_first_player() {
    let gs = two_player_game();
    assert_eq!(gs.active_player().name, "Alice");
}

#[test]
fn new_object_id_increments() {
    let mut gs = two_player_game();
    let id1 = gs.new_object_id();
    let id2 = gs.new_object_id();
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

#[test]
fn move_object_to_battlefield() {
    let mut gs = two_player_game();
    let card = test_card(1, "alice");
    gs.objects.insert(1, card);
    gs.player_zones.get_mut("alice").unwrap().hand.insert(1);

    gs.move_object(1, ZoneType::Battlefield, None);

    assert!(gs.battlefield.contains(&1));
    assert!(!gs.player_zones["alice"].hand.contains(&1));
}

#[test]
fn move_object_to_graveyard_defaults_to_owner() {
    let mut gs = two_player_game();
    let card = test_card(1, "alice");
    gs.objects.insert(1, card);
    gs.battlefield.insert(1);

    gs.move_object(1, ZoneType::Graveyard, None);

    assert!(!gs.battlefield.contains(&1));
    assert!(gs.player_zones["alice"].graveyard.contains(&1));
}

#[test]
fn find_zone_on_battlefield() {
    let mut gs = two_player_game();
    gs.battlefield.insert(1);
    assert_eq!(gs.find_zone(1), Some((ZoneType::Battlefield, None)));
}

#[test]
fn find_zone_in_hand() {
    let mut gs = two_player_game();
    gs.player_zones.get_mut("bob").unwrap().hand.insert(5);
    let (zone, player) = gs.find_zone(5).unwrap();
    assert_eq!(zone, ZoneType::Hand);
    assert_eq!(player, Some(&"bob".to_string()));
}

#[test]
fn find_zone_returns_none_for_missing_object() {
    let gs = two_player_game();
    assert_eq!(gs.find_zone(999), None);
}

#[test]
fn move_object_to_stack() {
    let mut gs = two_player_game();
    let card = test_card(1, "alice");
    gs.objects.insert(1, card);
    gs.player_zones.get_mut("alice").unwrap().hand.insert(1);

    gs.move_object(1, ZoneType::Stack, None);

    assert_eq!(gs.stack, vec![1]);
    assert!(!gs.player_zones["alice"].hand.contains(&1));
}

#[test]
fn move_object_to_exile() {
    let mut gs = two_player_game();
    gs.battlefield.insert(1);
    gs.objects.insert(1, test_card(1, "alice"));

    gs.move_object(1, ZoneType::Exile, None);

    assert!(!gs.battlefield.contains(&1));
    assert!(gs.exile.contains(&1));
}
