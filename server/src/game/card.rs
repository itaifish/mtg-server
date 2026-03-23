use serde::{Deserialize, Serialize};

/// Unique identifier for a card instance within a game.
/// Different from a card definition — this represents a specific physical card
/// in a specific game (two copies of Lightning Bolt are two different ObjectIds).
pub type ObjectId = u64;
pub type PlayerId = String;

/// CR 105 — There are five colors in the Magic game: white, blue, black, red,
/// and green.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Color {
    White,
    Blue,
    Black,
    Red,
    Green,
}

/// CR 107.4 — Individual mana symbols that can appear in a mana cost.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ManaSymbol {
    /// CR 107.4a — {W}, {U}, {B}, {R}, {G}
    Colored(Color),
    /// CR 107.4b — {1}, {2}, etc. Generic mana, payable with any type.
    Generic(u32),
    /// CR 107.4c — {C} Colorless mana, payable only with colorless mana.
    Colorless,
    /// CR 107.4e — {W/U}, {B/R}, etc. Payable with either color.
    Hybrid(Color, Color),
    /// CR 107.4e — {2/W}, {2/B}, etc. Payable with one colored or two of any.
    MonocoloredHybrid(Color),
    /// CR 107.4e — {C/W}, {C/R}, etc. Payable with colorless or one colored.
    ColorlessHybrid(Color),
    /// CR 107.4f — {W/P}, {U/P}, etc. Payable with one colored mana or 2 life.
    Phyrexian(Color),
    /// CR 107.4f — {W/U/P}, {B/R/P}, etc. Payable with either color or 2 life.
    HybridPhyrexian(Color, Color),
    /// CR 107.4h — {S} Snow mana, payable with mana from a snow source.
    Snow,
    /// CR 107.3 — {X} Variable mana.
    X,
}

/// A full mana cost is an ordered sequence of mana symbols.
/// CR 202.1 — A card's mana cost is indicated by mana symbols near the top of
/// the card.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ManaCost {
    pub symbols: Vec<ManaSymbol>,
}

impl ManaCost {
    /// CR 202.3 — The mana value of an object is a number equal to the total
    /// amount of mana in its mana cost, regardless of color.
    pub fn mana_value(&self) -> u32 {
        self.symbols
            .iter()
            .map(|s| match s {
                ManaSymbol::Colored(_) => 1,
                ManaSymbol::Generic(n) => *n,
                ManaSymbol::Colorless => 1,
                ManaSymbol::Hybrid(_, _) => 1,
                // CR 202.3e — Monocolored hybrid counts as the larger component
                ManaSymbol::MonocoloredHybrid(_) => 2,
                ManaSymbol::ColorlessHybrid(_) => 1,
                ManaSymbol::Phyrexian(_) => 1,
                ManaSymbol::HybridPhyrexian(_, _) => 1,
                ManaSymbol::Snow => 1,
                // CR 107.3g — X in mana cost is 0 when not on the stack
                ManaSymbol::X => 0,
            })
            .sum()
    }
}

/// CR 208 — Power and toughness modification, used by counters and effects.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PtModifier {
    pub power: i32,
    pub toughness: i32,
}

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

/// CR 205.4 — Supertypes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Supertype {
    Basic,
    Legendary,
    Snow,
    World,
}

/// CR 122 — A counter is a marker placed on an object or player that modifies
/// its characteristics and/or interacts with a rule, ability, or effect.
/// Counters are not objects and have no characteristics.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CounterType {
    /// CR 122.1a — +X/+Y and -X/-Y counters modify power and toughness.
    PowerToughness(PtModifier),

    // --- Keyword counters (CR 122.1b) ---
    /// CR 122.1b — A keyword counter causes the object to gain that keyword.
    Flying,
    FirstStrike,
    DoubleStrike,
    Deathtouch,
    Decayed,
    Exalted,
    Haste,
    Hexproof,
    Indestructible,
    Lifelink,
    Menace,
    Reach,
    Shadow,
    Trample,
    Vigilance,

    // --- Special counters ---
    /// CR 122.1c — Shield counters prevent destruction and damage.
    Shield,
    /// CR 122.1d — Stun counters prevent untapping.
    Stun,
    /// CR 122.1e — Loyalty counters on planeswalkers.
    Loyalty,
    /// CR 122.1g — Defense counters on battles. CR 310.4
    Defense,
    /// CR 122.1h — Finality counters exile instead of going to graveyard.
    Finality,

    /// Any other named counter (e.g., charge, lore, time, fade, etc.)
    Named(String),
}

impl CounterType {
    /// CR 122.1a — Returns the power/toughness modification this counter
    /// applies to a creature, if any.
    pub fn pt_modifier(&self) -> Option<PtModifier> {
        match self {
            CounterType::PowerToughness(m) => Some(*m),
            _ => None,
        }
    }

    /// CR 122.1b — Returns true if this counter grants a keyword.
    pub fn grants_keyword(&self) -> bool {
        matches!(
            self,
            CounterType::Flying
                | CounterType::FirstStrike
                | CounterType::DoubleStrike
                | CounterType::Deathtouch
                | CounterType::Decayed
                | CounterType::Exalted
                | CounterType::Haste
                | CounterType::Hexproof
                | CounterType::Indestructible
                | CounterType::Lifelink
                | CounterType::Menace
                | CounterType::Reach
                | CounterType::Shadow
                | CounterType::Trample
                | CounterType::Vigilance
        )
    }

    /// CR 122.3 — Returns true if this counter type annihilates with the given
    /// other type (e.g., +1/+1 and -1/-1 cancel out as a state-based action).
    pub fn annihilates_with(&self, other: &CounterType) -> bool {
        let plus = PtModifier { power: 1, toughness: 1 };
        let minus = PtModifier { power: -1, toughness: -1 };
        matches!(
            (self, other),
            (CounterType::PowerToughness(a), CounterType::PowerToughness(b))
                if (*a == plus && *b == minus) || (*a == minus && *b == plus)
        )
    }
}

/// CR 109.3 — An object's characteristics are name, mana cost, color, color
/// indicator, card type, subtype, supertype, rules text, abilities, power,
/// toughness, loyalty, defense, hand modifier, and life modifier.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardDefinition {
    pub name: String,
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
    /// Damage marked on this permanent (creatures only). Resets each cleanup.
    /// CR 120.3
    pub damage_marked: u32,
    /// CR 122 — Counters on this object, stored as type → count.
    pub counters: Vec<CounterEntry>,
    /// CR 310.8 — Protector of this battle, if it is a battle.
    pub protector: Option<PlayerId>,
}

/// A counter entry on an object: a type and how many of that type.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CounterEntry {
    pub counter_type: CounterType,
    pub count: u32,
}

impl CardInstance {
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
                PtModifier { power: 0, toughness: 0 },
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
        if let Some(entry) = self.counters.iter_mut().find(|e| e.counter_type == counter_type) {
            entry.count += amount;
        } else {
            self.counters.push(CounterEntry { counter_type, count: amount });
        }
    }

    /// Remove counters of a given type. Returns how many were actually removed.
    pub fn remove_counters(&mut self, counter_type: &CounterType, amount: u32) -> u32 {
        if let Some(entry) = self.counters.iter_mut().find(|e| e.counter_type == *counter_type) {
            let removed = amount.min(entry.count);
            entry.count -= removed;
            removed
        } else {
            0
        }
    }
}
