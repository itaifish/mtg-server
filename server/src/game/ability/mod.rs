use serde::{Deserialize, Serialize};

use super::card::ObjectId;
use super::mana::{ManaProduction, ManaType};

/// An ability on a card or permanent.
/// CR 113 — Abilities can be activated, triggered, or static.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ability {
    pub costs: Vec<AbilityCost>,
    pub effect: AbilityEffect,
    /// CR 605 — A mana ability doesn't use the stack and resolves immediately.
    pub is_mana_ability: bool,
}

/// Costs that must be paid to activate an ability. CR 118
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AbilityCost {
    /// {T} — Tap this permanent. CR 605.1a
    TapSelf,
    /// Pay mana of a specific type.
    Mana(Vec<ManaType>),
    /// Sacrifice this permanent.
    SacrificeSelf,
    /// Sacrifice another permanent.
    Sacrifice(ObjectId),
    /// Exile a card from a zone.
    Exile(ObjectId),
    /// Pay life.
    PayLife(u32),
    /// Discard a card.
    Discard(ObjectId),
}

/// The effect produced by an ability.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AbilityEffect {
    /// Add mana to the controller's mana pool.
    AddMana(Vec<ManaProduction>),
    /// Deal damage to a target.
    DealDamage { amount: u32 },
    /// Draw cards.
    DrawCards { count: u32 },
    /// Gain life.
    GainLife { amount: u32 },
    /// A named effect resolved by the engine via a registered handler function.
    /// Used for complex or card-specific effects that can't be expressed as
    /// simple data (e.g., "destroy target creature", "search your library").
    Custom { name: String },
}

/// CR 305.6 — Basic land types have intrinsic mana abilities.
/// Returns the intrinsic mana ability for a basic land subtype, if any.
pub fn intrinsic_land_ability(subtype: &str) -> Option<Ability> {
    let mana_type = match subtype {
        "Plains" => ManaType::White,
        "Island" => ManaType::Blue,
        "Swamp" => ManaType::Black,
        "Mountain" => ManaType::Red,
        "Forest" => ManaType::Green,
        _ => return None,
    };

    Some(Ability {
        costs: vec![AbilityCost::TapSelf],
        effect: AbilityEffect::AddMana(vec![ManaProduction::new(mana_type, 1)]),
        is_mana_ability: true,
    })
}

/// Collect all abilities for a card instance, including intrinsic land abilities.
pub fn all_abilities(definition: &super::card::CardDefinition) -> Vec<Ability> {
    let mut abilities = definition.abilities.clone();

    // CR 305.6 — Add intrinsic mana abilities for basic land subtypes
    for subtype in &definition.subtypes {
        if let Some(ability) = intrinsic_land_ability(subtype) {
            abilities.push(ability);
        }
    }

    abilities
}

#[cfg(test)]
mod tests;
