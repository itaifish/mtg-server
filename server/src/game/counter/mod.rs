use serde::{Deserialize, Serialize};

/// CR 208 — Power and toughness modification, used by counters and effects.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PtModifier {
    pub power: i32,
    pub toughness: i32,
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
        let plus = PtModifier {
            power: 1,
            toughness: 1,
        };
        let minus = PtModifier {
            power: -1,
            toughness: -1,
        };
        matches!(
            (self, other),
            (CounterType::PowerToughness(a), CounterType::PowerToughness(b))
                if (*a == plus && *b == minus) || (*a == minus && *b == plus)
        )
    }
}

/// A counter entry on an object: a type and how many of that type.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CounterEntry {
    pub counter_type: CounterType,
    pub count: u32,
}

#[cfg(test)]
mod tests;
