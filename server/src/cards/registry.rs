use std::collections::HashMap;
use std::sync::LazyLock;

use crate::game::ability::{Abilities, ActivatedAbility, AbilityCost, AbilityEffect, TriggeredAbility};
use crate::game::card::{CardDefinition, CardType, Supertype};
use crate::game::effect::{CounterSpec, Effect, Filter, PlayerSpec, TargetKind, TargetSpec, Value};
use crate::game::event::{TriggerEvent, TriggerFilter, TriggerPlayerRef};
use crate::game::mana::{Color, ManaCost, ManaProduction, ManaSymbol, ManaType};
use crate::game::zone::ZoneType;

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
        basic_land("Plains", "bc71ebf6-2056-41f7-be35-b2e5c34afa99"),
        basic_land("Island", "b2c6aa39-2d2a-459c-a555-fb48ba993373"),
        basic_land("Swamp", "56719f6a-1a6c-4c0a-8d21-18f7d7350b68"),
        basic_land("Mountain", "a3fb7228-e76b-4e96-a40e-20b5fed75685"),
        basic_land("Forest", "b34bb2dc-c1af-4d77-b0b3-a0fb342a5fc6"),
        // --- Mana Creatures ---
        mana_dork(
            "Llanowar Elves",
            "68954295-54e3-4303-a6bc-fc4547a4e3a3",
            cost(&[G]),
            &["Elf", "Druid"],
            ManaType::Green,
        ),
        mana_dork(
            "Elvish Mystic",
            "3f3b2c10-21f8-4e13-be83-4ef3fa36e123",
            cost(&[G]),
            &["Elf", "Druid"],
            ManaType::Green,
        ),
        // --- Vanilla Creatures ---
        vanilla(
            "Savannah Lions",
            "60ba93eb-39e6-4af2-9c66-cd38f72daff2",
            cost(&[W]),
            &[Color::White],
            2,
            1,
            &["Cat"],
        ),
        vanilla(
            "Coral Merfolk",
            "4ed27607-21a8-4bc3-997e-6d2242313f6d",
            cost(&[M1, U]),
            &[Color::Blue],
            2,
            1,
            &["Merfolk"],
        ),
        vanilla(
            "Walking Corpse",
            "fea95888-e16a-4209-9cd4-623f7f4d2f67",
            cost(&[M1, B]),
            &[Color::Black],
            2,
            2,
            &["Zombie"],
        ),
        vanilla(
            "Goblin Piker",
            "50608184-90d3-43d2-a221-deb186c78323",
            cost(&[M1, R]),
            &[Color::Red],
            2,
            1,
            &["Goblin", "Warrior"],
        ),
        vanilla(
            "Grizzly Bears",
            "14c8f55d-d177-4c25-a931-ebeb9e6062a0",
            cost(&[M1, G]),
            &[Color::Green],
            2,
            2,
            &["Bear"],
        ),
        vanilla(
            "Runeclaw Bear",
            "ec49dfcf-d16d-4621-af4b-4a6f09043221",
            cost(&[M1, G]),
            &[Color::Green],
            2,
            2,
            &["Bear"],
        ),
        vanilla(
            "Gray Ogre",
            "83c8a3a6-2e1a-4e26-8847-6d066f42d906",
            cost(&[M2, R]),
            &[Color::Red],
            2,
            2,
            &["Ogre"],
        ),
        vanilla(
            "Centaur Courser",
            "2f5bf099-2e01-4e1c-9ebf-0ce0ac66939e",
            cost(&[M2, G]),
            &[Color::Green],
            3,
            3,
            &["Centaur", "Warrior"],
        ),
        vanilla(
            "Hill Giant",
            "342199e0-15b6-4824-83da-25caef2592b3",
            cost(&[M3, R]),
            &[Color::Red],
            3,
            3,
            &["Giant"],
        ),
        vanilla(
            "Siege Mastodon",
            "b4c404d8-9f2d-4429-ac36-449ae319abb7",
            cost(&[M4, W]),
            &[Color::White],
            3,
            5,
            &["Elephant"],
        ),
        vanilla(
            "Craw Wurm",
            "6a462a69-3e42-41de-a3aa-a488d9f38d69",
            cost(&[M4, G, G]),
            &[Color::Green],
            6,
            4,
            &["Wurm"],
        ),
        // --- Creatures with triggered abilities ---
        soul_warden(),
        ajanis_pridemate(),
        // --- Instants ---
        instant(
            "Lightning Bolt",
            "4457ed35-7c10-48c8-9776-456485fdf070",
            cost(&[R]),
            &[Color::Red],
            Effect::DealDamage {
                amount: Value::Constant(3),
                target: TargetSpec::Chosen {
                    index: 0,
                    valid_kinds: vec![
                        TargetKind::Player,
                        TargetKind::Creature,
                        TargetKind::Planeswalker,
                    ],
                },
            },
        ),
        instant(
            "Healing Salve",
            "8da8644c-75a1-4fe9-8e94-900d948d631c",
            cost(&[W]),
            &[Color::White],
            Effect::GainLife {
                amount: Value::Constant(3),
                player: PlayerSpec::TargetPlayer(0),
            },
        ),
        // --- Sorceries ---
        sorcery(
            "Divination",
            "273b339c-964b-4a18-8eb5-ceb8abcdfd9e",
            cost(&[M2, U]),
            &[Color::Blue],
            Effect::DrawCards {
                count: Value::Constant(2),
                player: PlayerSpec::Controller,
            },
        ),
    ];

    cards.into_iter().map(|c| (c.name.clone(), c)).collect()
});

static ORACLE_REGISTRY: LazyLock<HashMap<String, &'static CardDefinition>> = LazyLock::new(|| {
    REGISTRY
        .values()
        .map(|c| (c.oracle_id.clone(), c))
        .collect()
});

pub fn card_by_name(name: &str) -> Option<&'static CardDefinition> {
    REGISTRY.get(name)
}

pub fn card_by_oracle_id(oracle_id: &str) -> Option<&'static CardDefinition> {
    ORACLE_REGISTRY.get(oracle_id).copied()
}

pub fn all_card_names() -> Vec<&'static str> {
    REGISTRY.keys().map(|s| s.as_str()).collect()
}

// --- Card builders ---

fn basic_land(name: &str, oracle_id: &str) -> CardDefinition {
    CardDefinition {
        name: name.into(),
        oracle_id: oracle_id.into(),
        card_types: vec![CardType::Land],
        subtypes: vec![name.into()],
        supertypes: vec![Supertype::Basic],
        ..Default::default()
    }
}

fn vanilla(
    name: &str,
    oracle_id: &str,
    mana_cost: ManaCost,
    colors: &[Color],
    power: i32,
    toughness: i32,
    subtypes: &[&str],
) -> CardDefinition {
    CardDefinition {
        name: name.into(),
        oracle_id: oracle_id.into(),
        mana_cost: Some(mana_cost),
        colors: colors.to_vec(),
        card_types: vec![CardType::Creature],
        subtypes: subtypes.iter().map(|s| s.to_string()).collect(),
        power: Some(power),
        toughness: Some(toughness),
        ..Default::default()
    }
}

fn instant(
    name: &str,
    oracle_id: &str,
    mana_cost: ManaCost,
    colors: &[Color],
    effect: Effect,
) -> CardDefinition {
    CardDefinition {
        name: name.into(),
        oracle_id: oracle_id.into(),
        mana_cost: Some(mana_cost),
        colors: colors.to_vec(),
        card_types: vec![CardType::Instant],
        spell_effect: Some(effect),
        ..Default::default()
    }
}

fn sorcery(
    name: &str,
    oracle_id: &str,
    mana_cost: ManaCost,
    colors: &[Color],
    effect: Effect,
) -> CardDefinition {
    CardDefinition {
        name: name.into(),
        oracle_id: oracle_id.into(),
        mana_cost: Some(mana_cost),
        colors: colors.to_vec(),
        card_types: vec![CardType::Sorcery],
        spell_effect: Some(effect),
        ..Default::default()
    }
}

fn mana_dork(
    name: &str,
    oracle_id: &str,
    mana_cost: ManaCost,
    subtypes: &[&str],
    produces: ManaType,
) -> CardDefinition {
    CardDefinition {
        name: name.into(),
        oracle_id: oracle_id.into(),
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
        abilities: Abilities {
            activated: HashMap::from([(ZoneType::Battlefield, vec![ActivatedAbility {
                costs: vec![AbilityCost::TapSelf],
                effect: AbilityEffect::AddMana(vec![ManaProduction::new(produces, 1)]),
                is_mana_ability: true,
            }])]),
            ..Default::default()
        },
        ..Default::default()
    }
}

fn soul_warden() -> CardDefinition {
    let mut triggers = HashMap::new();
    triggers.insert(
        ZoneType::Battlefield,
        vec![TriggeredAbility {
            trigger: TriggerEvent::EntersZone {
                zone: ZoneType::Battlefield,
            },
            filters: vec![
                TriggerFilter::ObjectMatches(vec![Filter::HasType("Creature".into())]),
                TriggerFilter::Not(Box::new(TriggerFilter::IsSelf)),
            ],
            effect: Effect::GainLife {
                amount: Value::Constant(1),
                player: PlayerSpec::Controller,
            },
            needs_targets: false,
            description: "Whenever another creature enters the battlefield, you gain 1 life."
                .into(),
        }],
    );
    CardDefinition {
        name: "Soul Warden".into(),
        oracle_id: "f3fad295-1af2-4ecc-8546-b121ad6be27b".into(),
        mana_cost: Some(cost(&[W])),
        colors: vec![Color::White],
        card_types: vec![CardType::Creature],
        subtypes: vec!["Human".into(), "Cleric".into()],
        power: Some(1),
        toughness: Some(1),
        abilities: Abilities { triggered: triggers, ..Default::default() },
        ..Default::default()
    }
}

fn ajanis_pridemate() -> CardDefinition {
    let mut triggers = HashMap::new();
    triggers.insert(
        ZoneType::Battlefield,
        vec![TriggeredAbility {
            trigger: TriggerEvent::LifeGained,
            filters: vec![TriggerFilter::PlayerIs(TriggerPlayerRef::You)],
            effect: Effect::AddCounters {
                target: TargetSpec::Source,
                counter: CounterSpec::PlusOnePlusOne,
                count: Value::Constant(1),
            },
            needs_targets: false,
            description: "Whenever you gain life, put a +1/+1 counter on Ajani's Pridemate.".into(),
        }],
    );
    CardDefinition {
        name: "Ajani's Pridemate".into(),
        oracle_id: "95e94dea-5ac0-4d6f-adec-ca147aee861f".into(),
        mana_cost: Some(cost(&[M1, W])),
        colors: vec![Color::White],
        card_types: vec![CardType::Creature],
        subtypes: vec!["Cat".into(), "Soldier".into()],
        power: Some(2),
        toughness: Some(2),
        abilities: Abilities { triggered: triggers, ..Default::default() },
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
        let activated = def.abilities.activated_in(ZoneType::Battlefield);
        assert_eq!(activated.len(), 1);
        assert!(activated[0].is_mana_ability);
    }

    #[test]
    fn basic_lands_have_intrinsic_abilities() {
        let forest = card_by_name("Forest").unwrap();
        assert!(forest.abilities.activated_in(ZoneType::Battlefield).is_empty());
        let all = crate::game::ability::all_activated(forest, ZoneType::Battlefield);
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
