use super::*;
use crate::game::state::tests_helper::two_player_game;

#[test]
fn pass_priority_advances_phase() {
    let mut state = two_player_game();
    let player_id = state.active_player().id.clone();
    let old_phase = state.phase;
    pass_priority(&mut state, &player_id).unwrap();
    assert_ne!(state.phase, old_phase);
    assert_eq!(state.action_count, 1);
}

#[test]
fn concede_eliminates_player() {
    let mut state = two_player_game();
    concede(&mut state, "alice").unwrap();
    assert!(
        state
            .players
            .iter()
            .find(|p| p.id == "alice")
            .unwrap()
            .has_lost
    );
    assert_eq!(state.status, GameStatus::Finished);
}

#[test]
fn concede_unknown_player_errors() {
    let mut state = two_player_game();
    let result = concede(&mut state, "nobody");
    assert!(matches!(result, Err(ActionError::PlayerNotFound(_))));
}

use crate::game::ability::Ability;
use crate::game::card::{CardDefinition, CardInstance, CardType, Supertype};
use crate::game::mana::{Color, ManaCost, ManaSymbol, ManaType, SymbolPayment};
use crate::game::phases_and_steps::Phase;

fn make_creature(id: u64, owner: &str) -> CardInstance {
    CardInstance {
        id,
        owner: owner.into(),
        controller: Some(owner.into()),
        definition: CardDefinition {
            name: "Grizzly Bears".into(),
            mana_cost: Some(ManaCost {
                symbols: vec![ManaSymbol::Generic(1), ManaSymbol::Colored(Color::Green)],
            }),
            colors: vec![Color::Green],
            card_types: vec![CardType::Creature],
            subtypes: vec![],
            supertypes: vec![],
            power: Some(2),
            toughness: Some(2),
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

fn make_forest(id: u64, owner: &str) -> CardInstance {
    CardInstance {
        id,
        owner: owner.into(),
        controller: Some(owner.into()),
        definition: CardDefinition {
            name: "Forest".into(),
            mana_cost: None,
            colors: vec![],
            card_types: vec![CardType::Land],
            subtypes: vec!["Forest".into()],
            supertypes: vec![Supertype::Basic],
            power: None,
            toughness: None,
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
fn cast_creature_with_mana() {
    let mut state = two_player_game();
    state.phase = Phase::PrecombatMain;

    // Put two forests on battlefield and a creature in hand
    let forest1 = make_forest(10, "alice");
    let forest2 = make_forest(11, "alice");
    let creature = make_creature(20, "alice");

    state.objects.insert(10, forest1);
    state.objects.insert(11, forest2);
    state.objects.insert(20, creature);
    state.battlefield.insert(10);
    state.battlefield.insert(11);
    state.player_zones.get_mut("alice").unwrap().hand.insert(20);

    // Tap both forests for mana
    activate_mana_ability(&mut state, "alice", 10, 0).unwrap();
    activate_mana_ability(&mut state, "alice", 11, 0).unwrap();

    // Cast Grizzly Bears ({1}{G}) — pay {1} with green, {G} with green
    let payment = vec![
        SymbolPayment {
            paid_with: vec![ManaType::Green],
        },
        SymbolPayment {
            paid_with: vec![ManaType::Green],
        },
    ];
    cast_spell(&mut state, "alice", 20, &payment).unwrap();

    // Creature should be on battlefield, mana pool empty
    assert!(state.battlefield.contains(&20));
    assert!(!state.player_zones["alice"].hand.contains(&20));
    assert_eq!(
        state
            .get_player("alice")
            .unwrap()
            .mana_pool
            .available(ManaType::Green),
        0
    );
}

#[test]
fn cast_spell_fails_without_mana() {
    let mut state = two_player_game();
    state.phase = Phase::PrecombatMain;

    let creature = make_creature(20, "alice");
    state.objects.insert(20, creature);
    state.player_zones.get_mut("alice").unwrap().hand.insert(20);

    let payment = vec![
        SymbolPayment {
            paid_with: vec![ManaType::Green],
        },
        SymbolPayment {
            paid_with: vec![ManaType::Green],
        },
    ];
    let result = cast_spell(&mut state, "alice", 20, &payment);
    assert!(result.is_err());
    // Card should still be in hand
    assert!(state.player_zones["alice"].hand.contains(&20));
}
