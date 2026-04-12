use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::ability::TriggeredAbility;
use super::card::{CardInstance, CardType, ObjectId, PlayerId};
use super::effect::{Effect, Filter, PlayerSpec, Selector};
use super::mana::ManaType;
use super::zone::ZoneType;

/// A game event that can trigger abilities or be modified by replacement effects.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum GameEvent {
    ZoneChange {
        object_id: ObjectId,
        from: ZoneType,
        to: ZoneType,
        owner: PlayerId,
        controller: Option<PlayerId>,
    },
    DamageDealt {
        source_id: ObjectId,
        target: DamageTarget,
        amount: u32,
        is_combat: bool,
    },
    LifeGained {
        player_id: PlayerId,
        amount: u32,
    },
    LifeLost {
        player_id: PlayerId,
        amount: u32,
    },
    CardDrawn {
        player_id: PlayerId,
    },
    ManaAdded {
        player_id: PlayerId,
        mana_type: ManaType,
        amount: u32,
    },
    SpellCast {
        object_id: ObjectId,
        controller: PlayerId,
    },
    PhaseStarted {
        phase: String,
        active_player: PlayerId,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DamageTarget {
    Player(PlayerId),
    Object(ObjectId),
}

/// The type of event that triggers an ability.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TriggerEvent {
    /// Object enters a zone (usually battlefield).
    EntersZone { zone: ZoneType },
    /// Object leaves a zone (usually battlefield).
    LeavesZone { zone: ZoneType },
    /// Object moves from one zone to another specific zone (e.g., dies = battlefield → graveyard).
    ZoneTransition { from: ZoneType, to: ZoneType },
    /// Damage is dealt.
    DamageDealt,
    /// Life is gained.
    LifeGained,
    /// Life is lost.
    LifeLost,
    /// A card is drawn.
    CardDrawn,
    /// A spell is cast.
    SpellCast,
    /// A phase or step begins.
    PhaseStarted { phase: String },
}

/// Filters that narrow which events match a trigger.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TriggerFilter {
    /// The object involved must match these card filters.
    ObjectMatches(Vec<Filter>),
    /// The object must be controlled by this player spec.
    ControlledBy(TriggerPlayerRef),
    /// The object must be the source card itself ("when THIS enters").
    IsSelf,
    /// The player involved must match.
    PlayerIs(TriggerPlayerRef),
    /// Damage must be combat damage.
    IsCombatDamage,
    /// Damage target must be a player.
    DamageTargetIsPlayer,
    /// Negates any filter.
    Not(Box<TriggerFilter>),
}

/// Who a trigger filter refers to, relative to the source's controller.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TriggerPlayerRef {
    You,
    Opponent,
    Any,
}

/// A pending trigger waiting to be put on the stack.
/// The controller may need to choose ordering and targets.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingTrigger {
    pub source_id: ObjectId,
    pub controller: PlayerId,
    pub effect: Effect,
    pub needs_targets: bool,
    pub description: String,
}

/// A replacement effect — modifies an event before it happens.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplacementEffect {
    /// What event type this replaces.
    pub replaces: TriggerEvent,
    /// Additional filters (same as trigger filters).
    pub filters: Vec<TriggerFilter>,
    /// What happens instead.
    pub replacement: ReplacementAction,
    /// The source permanent providing this replacement.
    pub source_id: ObjectId,
    /// The controller of the source.
    pub controller: PlayerId,
}

/// What a replacement effect does instead.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ReplacementAction {
    /// Prevent the event entirely (e.g., indestructible prevents destruction).
    Prevent,
    /// Exile instead of the original zone change (e.g., Rest in Peace).
    ExileInstead,
    /// Modify the amount (e.g., double damage).
    MultiplyAmount(u32),
    /// Replace with a different effect entirely.
    ReplaceWith(Effect),
}

/// Check if a triggered ability matches a game event.
pub fn trigger_matches(
    trigger: &TriggeredAbility,
    event: &GameEvent,
    source_id: ObjectId,
    source_controller: &str,
    objects: &HashMap<ObjectId, CardInstance>,
) -> bool {
    // Check event type matches
    let event_matches = match (&trigger.trigger, event) {
        (TriggerEvent::EntersZone { zone }, GameEvent::ZoneChange { to, .. }) => zone == to,
        (TriggerEvent::LeavesZone { zone }, GameEvent::ZoneChange { from, .. }) => zone == from,
        (
            TriggerEvent::ZoneTransition { from: tf, to: tt },
            GameEvent::ZoneChange { from, to, .. },
        ) => tf == from && tt == to,
        (TriggerEvent::DamageDealt, GameEvent::DamageDealt { .. }) => true,
        (TriggerEvent::LifeGained, GameEvent::LifeGained { .. }) => true,
        (TriggerEvent::LifeLost, GameEvent::LifeLost { .. }) => true,
        (TriggerEvent::CardDrawn, GameEvent::CardDrawn { .. }) => true,
        (TriggerEvent::SpellCast, GameEvent::SpellCast { .. }) => true,
        (TriggerEvent::PhaseStarted { phase: tp }, GameEvent::PhaseStarted { phase: ep, .. }) => {
            tp == ep
        }
        _ => false,
    };

    if !event_matches {
        return false;
    }

    // Check filters
    for filter in &trigger.filters {
        if !check_filter(filter, event, source_id, source_controller, objects) {
            return false;
        }
    }

    true
}

fn check_filter(
    filter: &TriggerFilter,
    event: &GameEvent,
    source_id: ObjectId,
    source_controller: &str,
    objects: &HashMap<ObjectId, CardInstance>,
) -> bool {
    match filter {
        TriggerFilter::IsSelf => event_object_id(event) == Some(source_id),
        TriggerFilter::ControlledBy(player_ref) => {
            let controller = event_controller(event);
            match player_ref {
                TriggerPlayerRef::You => controller.as_deref() == Some(source_controller),
                TriggerPlayerRef::Opponent => {
                    controller.as_deref() != Some(source_controller) && controller.is_some()
                }
                TriggerPlayerRef::Any => true,
            }
        }
        TriggerFilter::PlayerIs(player_ref) => {
            let player = event_player(event);
            match player_ref {
                TriggerPlayerRef::You => player.as_deref() == Some(source_controller),
                TriggerPlayerRef::Opponent => {
                    player.as_deref() != Some(source_controller) && player.is_some()
                }
                TriggerPlayerRef::Any => true,
            }
        }
        TriggerFilter::IsCombatDamage => {
            matches!(
                event,
                GameEvent::DamageDealt {
                    is_combat: true,
                    ..
                }
            )
        }
        TriggerFilter::DamageTargetIsPlayer => {
            matches!(
                event,
                GameEvent::DamageDealt {
                    target: DamageTarget::Player(_),
                    ..
                }
            )
        }
        TriggerFilter::ObjectMatches(filters) => {
            let obj_id = match event_object_id(event) {
                Some(id) => id,
                None => return false,
            };
            match objects.get(&obj_id) {
                Some(card) => card_matches_filters(&card.definition, filters),
                None => false,
            }
        }
        TriggerFilter::Not(inner) => {
            !check_filter(inner, event, source_id, source_controller, objects)
        }
    }
}

fn event_object_id(event: &GameEvent) -> Option<ObjectId> {
    match event {
        GameEvent::ZoneChange { object_id, .. } => Some(*object_id),
        GameEvent::DamageDealt { source_id, .. } => Some(*source_id),
        GameEvent::SpellCast { object_id, .. } => Some(*object_id),
        _ => None,
    }
}

fn event_controller(event: &GameEvent) -> Option<String> {
    match event {
        GameEvent::ZoneChange { controller, .. } => controller.clone(),
        GameEvent::SpellCast { controller, .. } => Some(controller.clone()),
        _ => None,
    }
}

fn event_player(event: &GameEvent) -> Option<String> {
    match event {
        GameEvent::LifeGained { player_id, .. } => Some(player_id.clone()),
        GameEvent::LifeLost { player_id, .. } => Some(player_id.clone()),
        GameEvent::CardDrawn { player_id, .. } => Some(player_id.clone()),
        GameEvent::ManaAdded { player_id, .. } => Some(player_id.clone()),
        _ => None,
    }
}

fn card_matches_filters(def: &super::card::CardDefinition, filters: &[Filter]) -> bool {
    filters.iter().all(|f| match f {
        Filter::HasType(t) => def.card_types.iter().any(|ct| format!("{:?}", ct) == *t),
        Filter::HasSubtype(s) => def.subtypes.contains(s),
        Filter::HasColor(c) => def.colors.contains(c),
        Filter::PowerLessOrEqual(n) => def.power.map(|p| p <= *n).unwrap_or(false),
        Filter::PowerGreaterOrEqual(n) => def.power.map(|p| p >= *n).unwrap_or(false),
        Filter::ToughnessLessOrEqual(n) => def.toughness.map(|t| t <= *n).unwrap_or(false),
        Filter::ManaValueLessOrEqual(n) => def
            .mana_cost
            .as_ref()
            .map(|c| c.mana_value() <= *n)
            .unwrap_or(false),
    })
}

#[cfg(test)]
mod tests;
