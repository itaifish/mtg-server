use serde::{Deserialize, Serialize};

use super::mana::ManaType;

/// A composable effect — the core of the effect DSL.
/// Cards define their behavior as a tree of these nodes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Effect {
    // --- Damage ---
    DealDamage { amount: Value, target: TargetSpec },

    // --- Life ---
    GainLife { amount: Value, player: PlayerSpec },
    LoseLife { amount: Value, player: PlayerSpec },

    // --- Cards ---
    DrawCards { count: Value, player: PlayerSpec },
    Discard { count: Value, player: PlayerSpec },
    Mill { count: Value, player: PlayerSpec },

    // --- Mana ---
    AddMana { mana_type: ManaType, amount: Value, player: PlayerSpec },

    // --- Permanents ---
    Destroy { target: TargetSpec },
    Exile { target: TargetSpec },
    Bounce { target: TargetSpec },
    Tap { target: TargetSpec },
    Untap { target: TargetSpec },

    // --- Counters ---
    AddCounters { target: TargetSpec, counter: CounterSpec, count: Value },
    RemoveCounters { target: TargetSpec, counter: CounterSpec, count: Value },

    // --- Stat modification ---
    ModifyPowerToughness { target: TargetSpec, power: i32, toughness: i32 },

    // --- Stack interaction ---
    Counter { target: TargetSpec },

    // --- Composability ---
    Sequence(Vec<Effect>),
    ForEach { selector: Selector, effect: Box<Effect> },
    Conditional { condition: Condition, then_effect: Box<Effect>, else_effect: Option<Box<Effect>> },
    Choose { count: u32, options: Vec<Effect> },

    // --- Fallback for truly unique cards ---
    Custom { name: String },
}

/// A value that can be constant or derived from game state.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Value {
    Constant(u32),
    XValue,
    Count(Selector),
}

/// Specifies which target(s) an effect applies to.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TargetSpec {
    /// The Nth target chosen when the spell was cast (0-indexed).
    Chosen(usize),
    /// Each object/player matching a selector.
    Each(Selector),
    /// The source object itself (e.g., "this creature gets +3/+3").
    Source,
}

/// Specifies which player(s) an effect applies to.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlayerSpec {
    Controller,
    Opponent,
    TargetPlayer(usize),
    Each,
}

/// Selects a set of objects or players from the game.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Selector {
    Creatures { controller: ControllerFilter, filters: Vec<Filter> },
    Permanents { controller: ControllerFilter, filters: Vec<Filter> },
    Players { filters: Vec<Filter> },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ControllerFilter {
    You,
    Opponent,
    Any,
}

/// Filters for selectors.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Filter {
    HasColor(super::mana::Color),
    HasType(String),
    HasSubtype(String),
    PowerLessOrEqual(i32),
    PowerGreaterOrEqual(i32),
    ToughnessLessOrEqual(i32),
    ManaValueLessOrEqual(u32),
}

/// Counter types for AddCounters/RemoveCounters effects.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum CounterSpec {
    PlusOnePlusOne,
    MinusOneMinusOne,
    Loyalty,
    Named(String),
}

/// Conditions for conditional effects.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Condition {
    ControlPermanent(Selector),
    LifeAtOrBelow(u32),
    LifeAtOrAbove(u32),
    OpponentControlsPermanent(Selector),
    StackIsEmpty,
}
