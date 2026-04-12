use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::card::{CardDefinition, ObjectId};
use super::effect::Effect;
use super::event::{TriggerEvent, TriggerFilter};
use super::mana::{ManaProduction, ManaType};
use super::zone::ZoneType;

/// All abilities on a card, keyed by the zone they function in.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Abilities {
    pub activated: HashMap<ZoneType, Vec<ActivatedAbility>>,
    pub triggered: HashMap<ZoneType, Vec<TriggeredAbility>>,
    // TODO: pub static_abilities: HashMap<ZoneType, Vec<StaticAbility>>,
}

impl Abilities {
    pub fn activated_in(&self, zone: ZoneType) -> &[ActivatedAbility] {
        self.activated
            .get(&zone)
            .map(|v| v.as_slice())
            .unwrap_or(&[])
    }

    pub fn triggered_in(&self, zone: ZoneType) -> &[TriggeredAbility] {
        self.triggered
            .get(&zone)
            .map(|v| v.as_slice())
            .unwrap_or(&[])
    }
}

/// An activated ability. CR 602
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivatedAbility {
    pub costs: Vec<AbilityCost>,
    pub effect: AbilityEffect,
    /// CR 605 — A mana ability doesn't use the stack and resolves immediately.
    pub is_mana_ability: bool,
}

/// A triggered ability. CR 603
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TriggeredAbility {
    pub trigger: TriggerEvent,
    pub filters: Vec<TriggerFilter>,
    pub effect: Effect,
    pub needs_targets: bool,
    pub description: String,
}

/// Costs that must be paid to activate an ability. CR 118
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AbilityCost {
    TapSelf,
    Mana(Vec<ManaType>),
    SacrificeSelf,
    Sacrifice(ObjectId),
    Exile(ObjectId),
    PayLife(u32),
    Discard(ObjectId),
}

/// The effect produced by an ability.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AbilityEffect {
    AddMana(Vec<ManaProduction>),
    Effect(Box<Effect>),
}

/// CR 305.6 — Basic land types have intrinsic mana abilities.
pub fn intrinsic_land_ability(subtype: &str) -> Option<ActivatedAbility> {
    let mana_type = match subtype {
        "Plains" => ManaType::White,
        "Island" => ManaType::Blue,
        "Swamp" => ManaType::Black,
        "Mountain" => ManaType::Red,
        "Forest" => ManaType::Green,
        _ => return None,
    };

    Some(ActivatedAbility {
        costs: vec![AbilityCost::TapSelf],
        effect: AbilityEffect::AddMana(vec![ManaProduction::new(mana_type, 1)]),
        is_mana_ability: true,
    })
}

/// Collect all activated abilities for a zone, including intrinsic land abilities.
pub fn all_activated(definition: &CardDefinition, zone: ZoneType) -> Vec<ActivatedAbility> {
    let mut result = definition.abilities.activated_in(zone).to_vec();

    if zone == ZoneType::Battlefield {
        for subtype in &definition.subtypes {
            if let Some(a) = intrinsic_land_ability(subtype) {
                result.push(a);
            }
        }
    }

    result
}

#[cfg(test)]
mod tests;
