use std::collections::HashMap;
use std::sync::LazyLock;

use crate::game::ability::{Ability, AbilityCost, AbilityEffect};
use crate::game::card::{CardDefinition, CardType, Supertype};
use crate::game::mana::{Color, ManaCost, ManaProduction, ManaSymbol, ManaType};

// Mana symbol shorthands
const W: ManaSymbol = ManaSymbol::Colored(Color::White);
const U: ManaSymbol = ManaSymbol::Colored(Color::Blue);
const B: ManaSymbol = ManaSymbol::Colored(Color::Black);
const R: ManaSymbol = ManaSymbol::Colored(Color::Red);
const G: ManaSymbol = ManaSymbol::Colored(Color::Green);
const M1: ManaSymbol = ManaSymbol::Generic(1);
const M2: ManaSymbol = ManaSymbol::Generic(2);
const M3: ManaSymbol = ManaSymbol::Generic(3);
const M4: ManaSymbol = ManaSymbol::Generic(4);

fn cost(symbols: &[ManaSymbol]) -> ManaCost {
    ManaCost {
        symbols: symbols.to_vec(),
    }
}

static REGISTRY: LazyLock<HashMap<String, CardDefinition>> = LazyLock::new(|| {
    let cards = vec![
        // --- Basic Lands ---
        basic_land("Plains"),
        basic_land("Island"),
        basic_land("Swamp"),
        basic_land("Mountain"),
        basic_land("Forest"),
        // --- Mana Creatures ---
        mana_dork(
            "Llanowar Elves",
            cost(&[G]),
            &["Elf", "Druid"],
            ManaType::Green,
        ),
        mana_dork(
            "Elvish Mystic",
            cost(&[G]),
            &["Elf", "Druid"],
            ManaType::Green,
        ),
        // --- Vanilla Creatures ---
        vanilla(
            "Savannah Lions",
            cost(&[W]),
            &[Color::White],
            2,
            1,
            &["Cat"],
        ),
        vanilla(
            "Coral Merfolk",
            cost(&[M1, U]),
            &[Color::Blue],
            2,
            1,
            &["Merfolk"],
        ),
        vanilla(
            "Walking Corpse",
            cost(&[M1, B]),
            &[Color::Black],
            2,
            2,
            &["Zombie"],
        ),
        vanilla(
            "Goblin Piker",
            cost(&[M1, R]),
            &[Color::Red],
            2,
            1,
            &["Goblin", "Warrior"],
        ),
        vanilla(
            "Grizzly Bears",
            cost(&[M1, G]),
            &[Color::Green],
            2,
            2,
            &["Bear"],
        ),
        vanilla(
            "Runeclaw Bear",
            cost(&[M1, G]),
            &[Color::Green],
            2,
            2,
            &["Bear"],
        ),
        vanilla("Grey Ogre", cost(&[M2, R]), &[Color::Red], 2, 2, &["Ogre"]),
        vanilla(
            "Centaur Courser",
            cost(&[M2, G]),
            &[Color::Green],
            3,
            3,
            &["Centaur", "Warrior"],
        ),
        vanilla(
            "Hill Giant",
            cost(&[M3, R]),
            &[Color::Red],
            3,
            3,
            &["Giant"],
        ),
        vanilla(
            "Siege Mastodon",
            cost(&[M4, W]),
            &[Color::White],
            3,
            5,
            &["Elephant"],
        ),
        vanilla(
            "Craw Wurm",
            cost(&[M4, G, G]),
            &[Color::Green],
            6,
            4,
            &["Wurm"],
        ),
    ];

    cards.into_iter().map(|c| (c.name.clone(), c)).collect()
});

pub fn card_by_name(name: &str) -> Option<&'static CardDefinition> {
    REGISTRY.get(name)
}

pub fn all_card_names() -> Vec<&'static str> {
    REGISTRY.keys().map(|s| s.as_str()).collect()
}

// --- Card builders ---

fn basic_land(name: &str) -> CardDefinition {
    CardDefinition {
        name: name.into(),
        card_types: vec![CardType::Land],
        subtypes: vec![name.into()],
        supertypes: vec![Supertype::Basic],
        ..Default::default()
    }
}

fn vanilla(
    name: &str,
    mana_cost: ManaCost,
    colors: &[Color],
    power: i32,
    toughness: i32,
    subtypes: &[&str],
) -> CardDefinition {
    CardDefinition {
        name: name.into(),
        mana_cost: Some(mana_cost),
        colors: colors.to_vec(),
        card_types: vec![CardType::Creature],
        subtypes: subtypes.iter().map(|s| s.to_string()).collect(),
        power: Some(power),
        toughness: Some(toughness),
        ..Default::default()
    }
}

fn mana_dork(
    name: &str,
    mana_cost: ManaCost,
    subtypes: &[&str],
    produces: ManaType,
) -> CardDefinition {
    CardDefinition {
        name: name.into(),
        mana_cost: Some(mana_cost),
        colors: vec![Color::Green],
        card_types: vec![CardType::Creature],
        subtypes: subtypes.iter().map(|s| s.to_string()).collect(),
        power: Some(1),
        toughness: Some(1),
        rules_text: format!(
            "{{T}}: Add {{{}}}.",
            match produces {
                ManaType::White => "W",
                ManaType::Blue => "U",
                ManaType::Black => "B",
                ManaType::Red => "R",
                ManaType::Green => "G",
                ManaType::Colorless => "C",
            }
        ),
        abilities: vec![Ability {
            costs: vec![AbilityCost::TapSelf],
            effect: AbilityEffect::AddMana(vec![ManaProduction::new(produces, 1)]),
            is_mana_ability: true,
        }],
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_registered_cards_resolve() {
        for name in all_card_names() {
            assert!(card_by_name(name).is_some(), "card '{}' not found", name);
        }
    }

    #[test]
    fn llanowar_elves_has_mana_ability() {
        let def = card_by_name("Llanowar Elves").unwrap();
        assert_eq!(def.abilities.len(), 1);
        assert!(def.abilities[0].is_mana_ability);
    }

    #[test]
    fn basic_lands_have_intrinsic_abilities() {
        let forest = card_by_name("Forest").unwrap();
        assert!(forest.abilities.is_empty());
        let all = crate::game::ability::all_abilities(forest);
        assert_eq!(all.len(), 1);
        assert!(all[0].is_mana_ability);
    }

    #[test]
    fn vanilla_creature_stats() {
        let bears = card_by_name("Grizzly Bears").unwrap();
        assert_eq!(bears.power, Some(2));
        assert_eq!(bears.toughness, Some(2));
        assert_eq!(bears.mana_cost.as_ref().unwrap().mana_value(), 2);
    }
}
