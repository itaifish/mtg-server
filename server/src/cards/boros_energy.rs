use std::collections::HashMap;

use crate::game::ability::{Abilities, ActivatedAbility, AbilityCost, AbilityEffect, StaticAbility, TriggeredAbility};
use crate::game::card::{CardDefinition, CardType};
use crate::game::effect::{Condition, ControllerFilter, Effect, Filter, PlayerSpec, Selector, Value};
use crate::game::event::{EventModification, TriggerEvent, TriggerFilter, TriggerPlayerRef};
use crate::game::mana::{Color, ManaProduction, ManaType};
use crate::game::zone::ZoneType;

use super::registry::{cost, W};

/// Sacred Foundry — Shock land (R/W)
/// As this land enters, you may pay 2 life. If you don't, it enters tapped.
/// {T}: Add {R} or {W}.
// TODO: player choice for pay 2 life (needs pending action system)
pub fn sacred_foundry() -> CardDefinition {
    let mut static_abilities = HashMap::new();
    static_abilities.insert(
        ZoneType::Battlefield,
        vec![StaticAbility::Replacement {
            applies_to: TriggerEvent::EntersZone { zone: ZoneType::Battlefield },
            filters: vec![TriggerFilter::IsSelf],
            modification: EventModification::ChooseOrElse {
                cost: vec![AbilityCost::PayLife(2)],
                fallback: Box::new(EventModification::EntersTapped),
            },
            is_self_replacement: true,
        }],
    );
    CardDefinition {
        name: "Sacred Foundry".into(),
        oracle_id: "45181cb8-2090-4471-ba90-e5a8f04d525f".into(),
        card_types: vec![CardType::Land],
        subtypes: vec!["Mountain".into(), "Plains".into()],
        abilities: Abilities { static_abilities, ..Default::default() },
        ..Default::default()
    }
}

/// Arena of Glory
/// This land enters tapped unless you control a Mountain.
/// {T}: Add {R}.
/// {R}, {T}, Exert this land: Add {R}{R}. If that mana is spent on a creature
/// spell, it gains haste until end of turn.
// TODO: exert mechanic, haste grant on mana spend
pub fn arena_of_glory() -> CardDefinition {
    let mut activated = HashMap::new();
    activated.insert(
        ZoneType::Battlefield,
        vec![ActivatedAbility {
            costs: vec![AbilityCost::TapSelf],
            effect: AbilityEffect::AddMana(vec![ManaProduction::new(ManaType::Red, 1)]),
            is_mana_ability: true,
        }],
    );
    let mut static_abilities = HashMap::new();
    static_abilities.insert(
        ZoneType::Battlefield,
        vec![StaticAbility::Replacement {
            applies_to: TriggerEvent::EntersZone { zone: ZoneType::Battlefield },
            filters: vec![TriggerFilter::IsSelf],
            modification: EventModification::EntersTappedUnless(
                Condition::ControlPermanent(Selector::Permanents {
                    controller: ControllerFilter::You,
                    filters: vec![Filter::HasSubtype("Mountain".into())],
                }),
            ),
            is_self_replacement: true,
        }],
    );
    CardDefinition {
        name: "Arena of Glory".into(),
        oracle_id: "63dfe794-5f56-41ec-9883-5523b41cc3e0".into(),
        card_types: vec![CardType::Land],
        abilities: Abilities { activated, static_abilities, ..Default::default() },
        ..Default::default()
    }
}

/// Guide of Souls — {W}
/// Whenever another creature you control enters, you gain 1 life and get {E}.
/// Whenever you attack, you may pay {E}{E}{E}. When you do, put two +1/+1
/// counters and a flying counter on target attacking creature. It becomes an
/// Angel in addition to its other types.
// TODO: attack trigger with energy payment + counters + type change
pub fn guide_of_souls() -> CardDefinition {
    let mut triggered = HashMap::new();
    triggered.insert(
        ZoneType::Battlefield,
        vec![TriggeredAbility {
            trigger: TriggerEvent::EntersZone { zone: ZoneType::Battlefield },
            filters: vec![
                TriggerFilter::ObjectMatches(vec![Filter::HasType("Creature".into())]),
                TriggerFilter::Not(Box::new(TriggerFilter::IsSelf)),
                TriggerFilter::ControlledBy(TriggerPlayerRef::You),
            ],
            effect: Effect::Sequence(vec![
                Effect::GainLife {
                    amount: Value::Constant(1),
                    player: PlayerSpec::Controller,
                },
                Effect::GainEnergy {
                    amount: Value::Constant(1),
                    player: PlayerSpec::Controller,
                },
            ]),
            needs_targets: false,
            description: "Whenever another creature you control enters, you gain 1 life and get {E}.".into(),
        }],
    );
    CardDefinition {
        name: "Guide of Souls".into(),
        oracle_id: "b304ac72-7f40-40de-b8d6-6392909b6029".into(),
        mana_cost: Some(cost(&[W])),
        colors: vec![Color::White],
        card_types: vec![CardType::Creature],
        subtypes: vec!["Spirit".into()],
        power: Some(1),
        toughness: Some(1),
        abilities: Abilities { triggered, ..Default::default() },
        ..Default::default()
    }
}
