use serde::{Deserialize, Serialize};

use super::mana::ManaType;

/// A composable effect — the core of the effect DSL.
/// Cards define their behavior as a tree of these nodes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Effect {
    // --- Damage ---
    DealDamage {
        amount: Value,
        target: TargetSpec,
    },

    // --- Life ---
    GainLife {
        amount: Value,
        player: PlayerSpec,
    },
    LoseLife {
        amount: Value,
        player: PlayerSpec,
    },

    // --- Cards ---
    DrawCards {
        count: Value,
        player: PlayerSpec,
    },
    Discard {
        count: Value,
        player: PlayerSpec,
    },
    Mill {
        count: Value,
        player: PlayerSpec,
    },

    // --- Mana ---
    AddMana {
        mana_type: ManaType,
        amount: Value,
        player: PlayerSpec,
    },

    // --- Permanents ---
    Destroy {
        target: TargetSpec,
    },
    Exile {
        target: TargetSpec,
    },
    Bounce {
        target: TargetSpec,
    },
    Tap {
        target: TargetSpec,
    },
    Untap {
        target: TargetSpec,
    },

    // --- Counters ---
    AddCounters {
        target: TargetSpec,
        counter: CounterSpec,
        count: Value,
    },
    RemoveCounters {
        target: TargetSpec,
        counter: CounterSpec,
        count: Value,
    },

    // --- Stat modification ---
    ModifyPowerToughness {
        target: TargetSpec,
        power: i32,
        toughness: i32,
    },

    // --- Stack interaction ---
    Counter {
        target: TargetSpec,
    },

    // --- Composability ---
    Sequence(Vec<Effect>),
    ForEach {
        selector: Selector,
        effect: Box<Effect>,
    },
    Conditional {
        condition: Condition,
        then_effect: Box<Effect>,
        else_effect: Option<Box<Effect>>,
    },
    Choose {
        count: u32,
        options: Vec<Effect>,
    },

    // --- Fallback for truly unique cards ---
    Custom {
        name: String,
    },
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
    /// Includes what kinds of targets are valid.
    Chosen {
        index: usize,
        valid_kinds: Vec<TargetKind>,
    },
    /// Each object/player matching a selector.
    Each(Selector),
    /// The source object itself (e.g., "this creature gets +3/+3").
    Source,
}

/// What kind of thing can be targeted.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TargetKind {
    Player,
    Creature,
    Planeswalker,
    Artifact,
    Enchantment,
    Land,
    Permanent,
    Spell,
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
    Creatures {
        controller: ControllerFilter,
        filters: Vec<Filter>,
    },
    Permanents {
        controller: ControllerFilter,
        filters: Vec<Filter>,
    },
    Players {
        filters: Vec<Filter>,
    },
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

/// Get the target requirements for an effect — one entry per chosen target,
/// each with the valid kinds for that slot.
pub fn target_requirements(effect: &Effect) -> Vec<Vec<TargetKind>> {
    let mut reqs: Vec<(usize, Vec<TargetKind>)> = vec![];
    collect_target_reqs(effect, &mut reqs);
    reqs.sort_by_key(|(idx, _)| *idx);
    reqs.into_iter().map(|(_, kinds)| kinds).collect()
}

fn collect_target_reqs(effect: &Effect, reqs: &mut Vec<(usize, Vec<TargetKind>)>) {
    match effect {
        Effect::DealDamage { target, .. }
        | Effect::Destroy { target }
        | Effect::Exile { target }
        | Effect::Bounce { target }
        | Effect::Tap { target }
        | Effect::Untap { target }
        | Effect::Counter { target }
        | Effect::AddCounters { target, .. }
        | Effect::RemoveCounters { target, .. }
        | Effect::ModifyPowerToughness { target, .. } => {
            if let TargetSpec::Chosen { index, valid_kinds } = target {
                if !reqs.iter().any(|(i, _)| i == index) {
                    reqs.push((*index, valid_kinds.clone()));
                }
            }
        }
        Effect::Sequence(effects)
        | Effect::Choose {
            options: effects, ..
        } => {
            for e in effects {
                collect_target_reqs(e, reqs);
            }
        }
        Effect::ForEach { effect, .. } => collect_target_reqs(effect, reqs),
        Effect::Conditional {
            then_effect,
            else_effect,
            ..
        } => {
            collect_target_reqs(then_effect, reqs);
            if let Some(e) = else_effect {
                collect_target_reqs(e, reqs);
            }
        }
        _ => {}
    }
}

/// Count the number of chosen targets an effect requires.
/// Returns the highest `Chosen(n)` index + 1, or 0 if no chosen targets.
pub fn required_target_count(effect: &Effect) -> usize {
    max_chosen_index(effect).map(|n| n + 1).unwrap_or(0)
}

fn max_chosen_index(effect: &Effect) -> Option<usize> {
    match effect {
        Effect::DealDamage { target, .. }
        | Effect::Destroy { target }
        | Effect::Exile { target }
        | Effect::Bounce { target }
        | Effect::Tap { target }
        | Effect::Untap { target }
        | Effect::Counter { target }
        | Effect::AddCounters { target, .. }
        | Effect::RemoveCounters { target, .. }
        | Effect::ModifyPowerToughness { target, .. } => match target {
            TargetSpec::Chosen { index: n, .. } => Some(*n),
            _ => None,
        },
        Effect::GainLife { player, .. }
        | Effect::LoseLife { player, .. }
        | Effect::DrawCards { player, .. }
        | Effect::Discard { player, .. }
        | Effect::Mill { player, .. }
        | Effect::AddMana { player, .. } => match player {
            PlayerSpec::TargetPlayer(n) => Some(*n),
            _ => None,
        },
        Effect::Sequence(effects)
        | Effect::Choose {
            options: effects, ..
        } => effects.iter().filter_map(max_chosen_index).max(),
        Effect::ForEach { effect, .. } => max_chosen_index(effect),
        Effect::Conditional {
            then_effect,
            else_effect,
            ..
        } => {
            let a = max_chosen_index(then_effect);
            let b = else_effect.as_ref().and_then(|e| max_chosen_index(e));
            a.max(b)
        }
        _ => None,
    }
}
