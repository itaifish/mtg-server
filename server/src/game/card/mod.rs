use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::ability::Abilities;
use super::counter::{CounterEntry, CounterType, PtModifier};
use super::effect::Effect;
use super::keyword::Keyword;
use super::mana::{Color, ManaCost};
use super::zone::ZoneType;

/// Unique identifier for a card instance within a game.
/// Different from a card definition — this represents a specific physical card
/// in a specific game (two copies of Lightning Bolt are two different ObjectIds).
pub type ObjectId = u64;
pub type PlayerId = String;

/// CR 205 — The type line contains the card type(s).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CardType {
    /// CR 301
    Artifact,
    /// CR 310
    Battle,
    /// CR 302
    Creature,
    /// CR 303
    Enchantment,
    /// CR 304
    Instant,
    /// CR 305
    Land,
    /// CR 306
    Planeswalker,
    /// CR 307
    Sorcery,
    /// CR 308
    Tribal,
}

impl CardType {
    /// CR 110.4 — Permanents are artifacts, battles, creatures, enchantments,
    /// lands, and planeswalkers.
    pub fn is_permanent(self) -> bool {
        matches!(
            self,
            Self::Artifact
                | Self::Battle
                | Self::Creature
                | Self::Enchantment
                | Self::Land
                | Self::Planeswalker
        )
    }
}

/// CR 205.4 — Supertypes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Supertype {
    Basic,
    Legendary,
    Snow,
    World,
}

/// CR 109.3 — An object's characteristics are name, mana cost, color, color
/// indicator, card type, subtype, supertype, rules text, abilities, power,
/// toughness, loyalty, defense, hand modifier, and life modifier.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CardDefinition {
    pub name: String,
    /// Scryfall oracle ID for card image lookup.
    pub oracle_id: String,
    pub mana_cost: Option<ManaCost>,
    pub colors: Vec<Color>,
    pub card_types: Vec<CardType>,
    pub subtypes: Vec<String>,
    pub supertypes: Vec<Supertype>,
    pub power: Option<i32>,
    pub toughness: Option<i32>,
    /// CR 306 — Loyalty (planeswalkers).
    pub loyalty: Option<u32>,
    /// CR 310.4 — Defense (battles).
    pub defense: Option<u32>,
    pub rules_text: String,
    /// CR 113 — All abilities on this card (activated, triggered, static),
    /// keyed by the zone they function in. Intrinsic abilities (e.g., basic
    /// land mana abilities) are added at runtime via `ability::all_activated()`.
    pub abilities: Abilities,
    /// CR 702 — Keyword abilities printed on the card.
    pub keywords: HashMap<Keyword, u32>,
    /// Effect when this spell resolves (instants/sorceries only).
    pub spell_effect: Option<Effect>,
}

/// A card instance in a game — a specific object with a definition and
/// game-specific state.
/// CR 109.1 — An object is an ability on the stack, a card, a copy of a card,
/// a token, a spell, a permanent, or an emblem.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardInstance {
    pub id: ObjectId,
    /// CR 108.3 — The owner of a card in the game is the player who started
    /// the game with it in their deck.
    pub owner: PlayerId,
    /// CR 108.4 / 110.2 — Controller, if applicable.
    pub controller: Option<PlayerId>,
    pub definition: CardDefinition,
    pub tapped: bool,
    /// CR 302.6 — A creature can't attack or use {T} abilities unless it has
    /// been under its controller's control since the start of their most
    /// recent turn. Cleared at start of controller's turn.
    pub summoning_sick: bool,
    /// Damage marked on this permanent (creatures only). Resets each cleanup.
    /// CR 120.3
    pub damage_marked: u32,
    /// CR 122 — Counters on this object, stored as type → count.
    pub counters: Vec<CounterEntry>,
    /// CR 702 — Current keyword abilities. Starts as a copy of the
    /// definition's keywords but can be modified by effects.
    pub keywords: HashMap<Keyword, u32>,
    /// CR 310.8 — Protector of this battle, if it is a battle.
    pub protector: Option<PlayerId>,
}

impl CardInstance {
    pub fn new(id: ObjectId, owner: impl Into<PlayerId>, definition: CardDefinition) -> Self {
        let owner = owner.into();
        let keywords = definition.keywords.clone();
        Self {
            id,
            controller: Some(owner.clone()),
            owner,
            definition,
            tapped: false,
            summoning_sick: true,
            damage_marked: 0,
            counters: vec![],
            keywords,
            protector: None,
        }
    }

    /// CR 302.6 — A creature has summoning sickness unless it has haste.
    pub fn is_summoning_sick(&self) -> bool {
        self.summoning_sick && !self.has_keyword(&Keyword::Haste)
    }

    /// Check if this instance currently has a keyword.
    pub fn has_keyword(&self, keyword: &Keyword) -> bool {
        self.keywords.get(keyword).copied().unwrap_or(0) > 0
    }

    /// CR 122.1a — Effective power after applying all P/T counter modifications.
    pub fn effective_power(&self) -> Option<i32> {
        self.definition
            .power
            .map(|base| base + self.total_pt_modifier().power)
    }

    /// CR 122.1a — Effective toughness after applying all P/T counter modifications.
    pub fn effective_toughness(&self) -> Option<i32> {
        self.definition
            .toughness
            .map(|base| base + self.total_pt_modifier().toughness)
    }

    /// Sum of all power/toughness modifications from counters.
    fn total_pt_modifier(&self) -> PtModifier {
        self.counters
            .iter()
            .filter_map(|entry| {
                entry.counter_type.pt_modifier().map(|m| PtModifier {
                    power: m.power * entry.count as i32,
                    toughness: m.toughness * entry.count as i32,
                })
            })
            .fold(
                PtModifier {
                    power: 0,
                    toughness: 0,
                },
                |acc, m| PtModifier {
                    power: acc.power + m.power,
                    toughness: acc.toughness + m.toughness,
                },
            )
    }

    /// CR 122.1b — Collect all keywords granted by keyword counters.
    pub fn keyword_counters(&self) -> Vec<&CounterType> {
        self.counters
            .iter()
            .filter(|e| e.counter_type.grants_keyword() && e.count > 0)
            .map(|e| &e.counter_type)
            .collect()
    }

    /// Get the count of a specific counter type on this object.
    pub fn counter_count(&self, counter_type: &CounterType) -> u32 {
        self.counters
            .iter()
            .find(|e| e.counter_type == *counter_type)
            .map(|e| e.count)
            .unwrap_or(0)
    }

    /// Add counters of a given type.
    pub fn add_counters(&mut self, counter_type: CounterType, amount: u32) {
        if let Some(entry) = self
            .counters
            .iter_mut()
            .find(|e| e.counter_type == counter_type)
        {
            entry.count += amount;
        } else {
            self.counters.push(CounterEntry {
                counter_type,
                count: amount,
            });
        }
    }

    /// Remove counters of a given type. Returns how many were actually removed.
    pub fn remove_counters(&mut self, counter_type: &CounterType, amount: u32) -> u32 {
        if let Some(entry) = self
            .counters
            .iter_mut()
            .find(|e| e.counter_type == *counter_type)
        {
            let removed = amount.min(entry.count);
            entry.count -= removed;
            removed
        } else {
            0
        }
    }
}

#[cfg(test)]
mod tests;
