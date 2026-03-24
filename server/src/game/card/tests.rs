use super::*;
use crate::game::counter::{CounterEntry, CounterType, PtModifier};
use crate::game::mana::Color;

fn bare_creature(id: ObjectId, power: i32, toughness: i32) -> CardInstance {
    CardInstance {
        id,
        owner: "player1".into(),
        controller: Some("player1".into()),
        definition: CardDefinition {
            name: "Test Creature".into(),
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
fn effective_power_with_no_counters() {
    let card = bare_creature(1, 3, 4);
    assert_eq!(card.effective_power(), Some(3));
    assert_eq!(card.effective_toughness(), Some(4));
}

#[test]
fn effective_power_with_plus_counters() {
    let mut card = bare_creature(1, 2, 2);
    card.add_counters(
        CounterType::PowerToughness(PtModifier {
            power: 1,
            toughness: 1,
        }),
        3,
    );
    assert_eq!(card.effective_power(), Some(5));
    assert_eq!(card.effective_toughness(), Some(5));
}

#[test]
fn effective_power_with_minus_counters() {
    let mut card = bare_creature(1, 4, 4);
    card.add_counters(
        CounterType::PowerToughness(PtModifier {
            power: -1,
            toughness: -1,
        }),
        2,
    );
    assert_eq!(card.effective_power(), Some(2));
    assert_eq!(card.effective_toughness(), Some(2));
}

#[test]
fn noncreature_has_no_effective_power() {
    let mut card = bare_creature(1, 3, 3);
    card.definition.power = None;
    card.definition.toughness = None;
    assert_eq!(card.effective_power(), None);
    assert_eq!(card.effective_toughness(), None);
}

#[test]
fn add_counters_creates_new_entry() {
    let mut card = bare_creature(1, 1, 1);
    card.add_counters(CounterType::Flying, 1);
    assert_eq!(card.counter_count(&CounterType::Flying), 1);
}

#[test]
fn add_counters_increments_existing() {
    let mut card = bare_creature(1, 1, 1);
    card.add_counters(CounterType::Flying, 1);
    card.add_counters(CounterType::Flying, 2);
    assert_eq!(card.counter_count(&CounterType::Flying), 3);
}

#[test]
fn remove_counters_decrements() {
    let mut card = bare_creature(1, 1, 1);
    card.add_counters(CounterType::Shield, 3);
    let removed = card.remove_counters(&CounterType::Shield, 2);
    assert_eq!(removed, 2);
    assert_eq!(card.counter_count(&CounterType::Shield), 1);
}

#[test]
fn remove_counters_caps_at_available() {
    let mut card = bare_creature(1, 1, 1);
    card.add_counters(CounterType::Loyalty, 2);
    let removed = card.remove_counters(&CounterType::Loyalty, 5);
    assert_eq!(removed, 2);
    assert_eq!(card.counter_count(&CounterType::Loyalty), 0);
}

#[test]
fn remove_counters_returns_zero_if_absent() {
    let mut card = bare_creature(1, 1, 1);
    let removed = card.remove_counters(&CounterType::Stun, 1);
    assert_eq!(removed, 0);
}

#[test]
fn keyword_counters_collects_granted_keywords() {
    let mut card = bare_creature(1, 1, 1);
    card.counters = vec![
        CounterEntry {
            counter_type: CounterType::Flying,
            count: 1,
        },
        CounterEntry {
            counter_type: CounterType::Shield,
            count: 1,
        },
        CounterEntry {
            counter_type: CounterType::Trample,
            count: 2,
        },
    ];
    let keywords = card.keyword_counters();
    assert_eq!(keywords.len(), 2);
    assert!(keywords.contains(&&CounterType::Flying));
    assert!(keywords.contains(&&CounterType::Trample));
}
