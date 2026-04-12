use crate::engine::triggers::process_pending_triggers;
use crate::game::ability::{all_activated, AbilityCost, AbilityEffect, StaticAbility};
use crate::game::card::{CardDefinition, CardInstance, CardType, ObjectId};
use crate::game::effect::{Condition, ControllerFilter, CounterSpec, Effect, PlayerSpec, Selector, TargetSpec, TokenSource, Value};
use crate::game::event::EventModification;
use crate::game::mana::SymbolPayment;
use crate::game::phases_and_steps::Phase;
use crate::game::stack::{SpellTarget, StackEntry, StackEntryKind};
use crate::game::state::{ChoiceEffect, ChoiceKind, GameState, GameStatus, PendingChoice};
use crate::game::zone::ZoneType;

use super::state_based;

pub mod combat;
pub mod pregame;

/// Run state-based actions and process any pending triggers.
fn check_state_and_triggers(state: &mut GameState) {
    state_based::check(state);
    process_pending_triggers(state);
}

/// Errors from action execution.
#[derive(Debug, thiserror::Error)]
pub enum ActionError {
    #[error("player {0} not found")]
    PlayerNotFound(String),
    #[error("{0}")]
    Illegal(String),
}

/// CR 307.1 / 505.1 — A player can take sorcery-speed actions only during
/// their main phase, when the stack is empty, and they have priority.
pub fn can_play_at_sorcery_speed(state: &GameState, player_id: &str) -> bool {
    let is_main = matches!(state.phase, Phase::PrecombatMain | Phase::PostcombatMain);
    is_main && state.stack.is_empty() && state.has_priority(player_id)
}

/// Pass priority. CR 117.4
///
/// When a player passes, priority moves to the next player. If all living
/// players pass in succession:
/// - If the stack is non-empty, resolve the top item.
/// - If the stack is empty, advance to the next phase/step.
pub fn pass_priority(state: &mut GameState, player_id: &str) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if !state.has_priority(player_id) {
        return Err(ActionError::Illegal("you don't have priority".into()));
    }

    state.record_action();

    let all_passed = state.pass_priority_to_next(player_id);

    tracing::info!(
        "{} has passed priority. All players passed? {}",
        &player_id,
        &all_passed
    );

    if all_passed {
        if state.stack.is_empty() {
            state.advance_phase();
        } else {
            resolve_top_of_stack(state)?;
            state.reset_priority_to_active();
        }
    }

    check_state_and_triggers(state);
    process_auto_passes(state)?;
    Ok(())
}

/// Repeatedly auto-pass for players whose auto-pass mode is active.
/// Set auto-pass mode for a player and immediately process if they have priority.
pub fn set_auto_pass(
    state: &mut GameState,
    player_id: &str,
    mode: crate::game::state::AutoPassMode,
) -> Result<(), ActionError> {
    state.set_auto_pass(player_id, mode);
    if state.should_auto_pass(player_id) {
        if state.has_priority(player_id) {
            pass_priority(state, player_id)?;
        }
    } else {
        // Condition already met — clear immediately
        state.clear_auto_pass(player_id);
    }
    Ok(())
}

fn process_auto_passes(state: &mut GameState) -> Result<(), ActionError> {
    for i in 0..1000 {
        if state.status != GameStatus::InProgress {
            break;
        }
        let priority_id = state.priority_player().id.clone();
        if !state.should_auto_pass(&priority_id) {
            state.clear_auto_pass(&priority_id);
            break;
        }
        if i == 999 {
            tracing::warn!("auto-pass loop hit 1000 iterations, breaking");
        }
        pass_priority(state, &priority_id)?;
    }
    Ok(())
}

/// Resolve the top item on the stack. CR 608
/// TODO: support abilities on the stack (not just spells)
fn resolve_top_of_stack(state: &mut GameState) -> Result<(), ActionError> {
    let entry = state
        .stack
        .pop()
        .ok_or_else(|| ActionError::Illegal("stack is empty".into()))?;

    match &entry.kind {
        StackEntryKind::Spell { object_id } => {
            let object_id = *object_id;
            let card = state
                .objects
                .get(&object_id)
                .ok_or_else(|| ActionError::Illegal("object not found".into()))?;

            let card_types = card.definition.card_types.clone();
            let spell_effect = card.definition.spell_effect.clone();

            if card_types.iter().any(|t| t.is_permanent()) {
                enter_battlefield(state, object_id, ZoneType::Stack);
            } else {
                if let Some(effect) = spell_effect {
                    resolve_effect(state, &effect, &entry)?;
                }
                state.send_to_graveyard(object_id);
            }
        }
        StackEntryKind::Ability { effect, .. } => {
            let effect = effect.clone();
            resolve_effect(state, &effect, &entry)?;
        }
    }

    Ok(())
}

/// Resolve an Effect DSL node against the game state.
fn resolve_effect(
    state: &mut GameState,
    effect: &Effect,
    entry: &StackEntry,
) -> Result<(), ActionError> {
    match effect {
        Effect::DealDamage { amount, target } => {
            let amount = eval_value(state, amount);
            for target in get_referenced_targets(state, target, entry) {
                match target {
                    SpellTarget::Player(pid) => state.deal_damage_to_player(&pid, amount),
                    SpellTarget::Object(oid) => {
                        if let Some(card) = state.objects.get_mut(&oid) {
                            card.damage_marked += amount;
                        }
                    }
                }
            }
        }
        Effect::GainLife { amount, player } => {
            let amount = eval_value(state, amount);
            for pid in get_referenced_players(state, player, entry) {
                state.gain_life(&pid, amount);
            }
        }
        // CR 119.3a — Loss of life is not damage.
        Effect::LoseLife { amount, player } => {
            let amount = eval_value(state, amount);
            for pid in get_referenced_players(state, player, entry) {
                if let Some(p) = state.get_player_mut(&pid) {
                    p.life_total -= amount as i32;
                }
            }
        }
        Effect::DrawCards { count, player } => {
            let count = eval_value(state, count);
            for pid in get_referenced_players(state, player, entry) {
                for _ in 0..count {
                    state.draw_card(&pid);
                }
            }
        }
        Effect::Destroy { target } => {
            for target in get_referenced_targets(state, target, entry) {
                if let SpellTarget::Object(oid) = target {
                    state.send_to_graveyard(oid);
                }
            }
        }
        Effect::AddCounters {
            target,
            counter,
            count,
        } => {
            let count = eval_value(state, count);
            for target in get_referenced_targets(state, target, entry) {
                if let SpellTarget::Object(oid) = target {
                    if let Some(card) = state.objects.get_mut(&oid) {
                        let counter_type = match counter {
                            CounterSpec::PlusOnePlusOne => {
                                crate::game::counter::CounterType::PowerToughness(
                                    crate::game::counter::PtModifier {
                                        power: 1,
                                        toughness: 1,
                                    },
                                )
                            }
                            CounterSpec::MinusOneMinusOne => {
                                crate::game::counter::CounterType::PowerToughness(
                                    crate::game::counter::PtModifier {
                                        power: -1,
                                        toughness: -1,
                                    },
                                )
                            }
                            CounterSpec::Loyalty => crate::game::counter::CounterType::Loyalty,
                            CounterSpec::Named(name) => {
                                crate::game::counter::CounterType::Named(name.clone())
                            }
                        };
                        card.add_counters(counter_type, count);
                    }
                }
            }
        }
        Effect::Sequence(effects) => {
            for e in effects {
                resolve_effect(state, e, entry)?;
            }
        }
        Effect::GainEnergy { amount, player } => {
            let amount = eval_value(state, amount);
            for pid in get_referenced_players(state, player, entry) {
                state.gain_energy(&pid, amount);
            }
        }
        Effect::CreateToken {
            token,
            count,
            player,
        } => {
            let count = eval_value(state, count);
            for pid in get_referenced_players(state, player, entry) {
                for _ in 0..count {
                    create_token(state, &pid, token);
                }
            }
        }
        Effect::Custom { name } => {
            tracing::warn!(%name, "unimplemented custom effect");
        }
        _ => {
            // TODO: implement remaining effect types
        }
    }
    Ok(())
}

/// CR 614.12 — Apply replacement effects, then move the object to the battlefield.
/// If a player choice is needed, sets `pending_choice` and returns without moving.
pub(crate) fn enter_battlefield(state: &mut GameState, object_id: ObjectId, _from: ZoneType) {
    let mut enters_tapped = false;

    if let Some(card) = state.objects.get(&object_id) {
        let controller = card.controller.clone().unwrap_or_else(|| card.owner.clone());

        for ability in card.definition.abilities.static_in(ZoneType::Battlefield) {
            if let StaticAbility::Replacement { modification, is_self_replacement: true, .. } = ability {
                match modification {
                    EventModification::EntersTapped => {
                        enters_tapped = true;
                    }
                    EventModification::EntersTappedUnless(condition) => {
                        if !evaluate_condition(state, condition, &controller) {
                            enters_tapped = true;
                        }
                    }
                    EventModification::ChooseOrElse { cost, fallback } => {
                        let tapped_on_no = matches!(fallback.as_ref(), EventModification::EntersTapped);
                        let cost_desc = cost.iter().map(|c| format!("{:?}", c)).collect::<Vec<_>>().join(", ");
                        state.pending_choice = Some(PendingChoice {
                            player_id: controller.clone(),
                            kind: ChoiceKind::YesNo {
                                yes: ChoiceEffect::EnterBattlefield { object_id, tapped: false, costs: cost.clone() },
                                no: ChoiceEffect::EnterBattlefield { object_id, tapped: tapped_on_no, costs: vec![] },
                            },
                            prompt: format!("Pay {}?", cost_desc),
                        });
                        return;
                    }
                    _ => {}
                }
            }
        }
    }

    state.move_object(object_id, ZoneType::Battlefield);

    if enters_tapped {
        if let Some(card) = state.objects.get_mut(&object_id) {
            card.tapped = true;
        }
    }
}

/// Evaluate a condition against the current game state.
fn evaluate_condition(
    state: &GameState,
    condition: &crate::game::effect::Condition,
    controller: &str,
) -> bool {
    use crate::game::effect::{Condition, ControllerFilter, Selector};

    match condition {
        Condition::ControlPermanent(selector) => match selector {
            Selector::Permanents { controller: cf, filters } => {
                let check_controller = match cf {
                    ControllerFilter::You => Some(controller),
                    ControllerFilter::Any => None,
                    ControllerFilter::Opponent => return false, // TODO
                };
                state.battlefield.iter().any(|&oid| {
                    let Some(card) = state.objects.get(&oid) else { return false };
                    if let Some(pid) = check_controller {
                        if card.controller.as_deref() != Some(pid) {
                            return false;
                        }
                    }
                    crate::game::event::card_matches_filters(&card.definition, filters)
                })
            }
            _ => false,
        },
        Condition::LifeAtOrBelow(n) => {
            state.get_player(controller).map(|p| p.life_total <= *n as i32).unwrap_or(false)
        }
        Condition::LifeAtOrAbove(n) => {
            state.get_player(controller).map(|p| p.life_total >= *n as i32).unwrap_or(false)
        }
        _ => false,
    }
}

/// Resolve a pending yes/no choice.
pub fn resolve_choice(state: &mut GameState, player_id: &str, answer: bool) -> Result<(), ActionError> {
    let choice = state.pending_choice.take()
        .ok_or_else(|| ActionError::Illegal("no pending choice".into()))?;

    if choice.player_id != player_id {
        state.pending_choice = Some(choice);
        return Err(ActionError::Illegal("not your choice to make".into()));
    }

    let effect = match choice.kind {
        ChoiceKind::YesNo { yes, no } => if answer { yes } else { no },
        _ => return Err(ActionError::Illegal("expected a yes/no choice".into())),
    };

    apply_choice_effect(state, player_id, &effect);
    check_state_and_triggers(state);
    Ok(())
}

fn apply_choice_effect(state: &mut GameState, player_id: &str, effect: &ChoiceEffect) {
    match effect {
        ChoiceEffect::EnterBattlefield { object_id, tapped, costs } => {
            for cost in costs {
                match cost {
                    AbilityCost::PayLife(n) => {
                        if let Some(p) = state.get_player_mut(player_id) {
                            p.life_total -= *n as i32;
                        }
                    }
                    _ => {
                        tracing::warn!(?cost, "unhandled replacement cost");
                    }
                }
            }
            state.move_object(*object_id, ZoneType::Battlefield);
            if *tapped {
                if let Some(card) = state.objects.get_mut(object_id) {
                    card.tapped = true;
                }
            }
        }
        ChoiceEffect::ResolveEffect(_effect) => {
            // TODO: resolve arbitrary effects
        }
        ChoiceEffect::Nothing => {}
    }
}

fn create_token(state: &mut GameState, controller: &str, source: &TokenSource) {
    let def: CardDefinition = match source {
        TokenSource::Defined(td) => td.clone().into(),
        TokenSource::CopyOf(_) => {
            tracing::warn!("CopyOf tokens not yet implemented");
            return;
        }
    };

    let id = state.new_object_id();
    let mut instance = CardInstance::new(id, controller, def);
    instance.controller = Some(controller.to_string());
    state.objects.insert(id, instance);
    enter_battlefield(state, id, ZoneType::None);
}

fn eval_value(_state: &GameState, value: &Value) -> u32 {
    match value {
        Value::Constant(n) => *n,
        Value::XValue => 0,           // TODO: track X from mana payment
        Value::Count(_selector) => 0, // TODO: count matching objects
    }
}

fn get_referenced_targets(
    _state: &GameState,
    spec: &TargetSpec,
    entry: &StackEntry,
) -> Vec<SpellTarget> {
    match spec {
        TargetSpec::Chosen { index, .. } => {
            entry.targets.get(*index).cloned().into_iter().collect()
        }
        TargetSpec::Source => {
            let id = match &entry.kind {
                StackEntryKind::Spell { object_id } => *object_id,
                StackEntryKind::Ability { source_id, .. } => *source_id,
            };
            vec![SpellTarget::Object(id)]
        }
        TargetSpec::Each(_selector) => vec![], // TODO: resolve selector
    }
}

fn get_referenced_players(state: &GameState, spec: &PlayerSpec, entry: &StackEntry) -> Vec<String> {
    match spec {
        PlayerSpec::Controller => vec![entry.controller.clone()],
        PlayerSpec::TargetPlayer(idx) => match entry.targets.get(*idx) {
            Some(SpellTarget::Player(pid)) => vec![pid.clone()],
            _ => vec![],
        },
        PlayerSpec::Opponent => state
            .living_turn_order
            .iter()
            .filter(|id| id.as_str() != entry.controller)
            .cloned()
            .collect(),
        PlayerSpec::Each => state.living_turn_order.clone(),
    }
}

/// Activate a mana ability on a permanent. CR 605 — Mana abilities don't
/// use the stack and resolve immediately.
pub fn activate_mana_ability(
    state: &mut GameState,
    player_id: &str,
    object_id: u64,
    ability_index: usize,
) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if !state.battlefield.contains(&object_id) {
        return Err(ActionError::Illegal(
            "object is not on the battlefield".into(),
        ));
    }

    let card = state
        .objects
        .get(&object_id)
        .ok_or_else(|| ActionError::Illegal("object not found".into()))?;

    if card.controller.as_deref() != Some(player_id) {
        return Err(ActionError::Illegal(
            "you don't control this permanent".into(),
        ));
    }

    let abilities = all_activated(&card.definition, ZoneType::Battlefield);
    let ability = abilities
        .get(ability_index)
        .ok_or_else(|| ActionError::Illegal("invalid ability index".into()))?
        .clone();

    if !ability.is_mana_ability {
        return Err(ActionError::Illegal("not a mana ability".into()));
    }

    // Validate costs before paying any
    for cost in &ability.costs {
        match cost {
            AbilityCost::TapSelf => {
                let card = state
                    .objects
                    .get(&object_id)
                    .ok_or_else(|| ActionError::Illegal("object not found".into()))?;
                if card.tapped {
                    return Err(ActionError::Illegal("permanent is already tapped".into()));
                }
                if card.is_summoning_sick()
                    && card.definition.card_types.contains(&CardType::Creature)
                {
                    return Err(ActionError::Illegal(
                        "creature has summoning sickness".into(),
                    ));
                }
            }
            _ => return Err(ActionError::Illegal("unsupported ability cost".into())),
        }
    }

    // Pay costs
    for cost in &ability.costs {
        #[allow(clippy::single_match)]
        match cost {
            AbilityCost::TapSelf => {
                let card = state
                    .objects
                    .get_mut(&object_id)
                    .ok_or_else(|| ActionError::Illegal("object not found".into()))?;
                card.tapped = true;
            }
            _ => {}
        }
    }

    // Resolve effect
    // TODO: replacement effects on mana production
    // TODO: triggered abilities on mana production
    match &ability.effect {
        AbilityEffect::AddMana(productions) => {
            for prod in productions {
                match &prod.restriction {
                    None => state.add_mana(player_id, prod.mana_type, prod.amount),
                    Some(r) => {
                        state.add_mana_restricted(player_id, prod.mana_type, prod.amount, r.clone())
                    }
                }
            }
        }
        _ => return Err(ActionError::Illegal("unsupported ability effect".into())),
    }

    state.record_action();
    Ok(())
}

/// Cast a spell. CR 601
///
/// Puts the spell on the stack after paying costs. It resolves when all
/// players pass priority (handled by `pass_priority` → `resolve_top_of_stack`).
/// TODO: targets, modal choices, X costs, additional costs
pub fn cast_spell(
    state: &mut GameState,
    player_id: &str,
    object_id: u64,
    mana_payment: &[SymbolPayment],
    targets: Vec<SpellTarget>,
) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if !state.has_priority(player_id) {
        return Err(ActionError::Illegal("you don't have priority".into()));
    }

    if !state.is_in_hand(player_id, object_id) {
        return Err(ActionError::Illegal("card is not in your hand".into()));
    }

    let card = state
        .objects
        .get(&object_id)
        .ok_or_else(|| ActionError::Illegal("object not found".into()))?;

    let card_types = card.definition.card_types.clone();
    let mana_cost = card
        .definition
        .mana_cost
        .clone()
        .ok_or_else(|| ActionError::Illegal("card has no mana cost".into()))?;

    // CR 601.2c — Validate targets
    if let Some(effect) = &card.definition.spell_effect {
        let required = crate::game::effect::required_target_count(effect);
        if targets.len() < required {
            return Err(ActionError::Illegal(format!(
                "spell requires {} target(s), got {}",
                required,
                targets.len()
            )));
        }
    }

    // CR 304.1 — Instants can be cast anytime you have priority
    // CR 307.1 / 302.1 — Everything else is sorcery speed
    let is_instant = card_types.contains(&CardType::Instant);
    if !is_instant && !can_play_at_sorcery_speed(state, player_id) {
        return Err(ActionError::Illegal(
            "can only cast this spell at sorcery speed".into(),
        ));
    }

    // Pay mana cost
    let player = state
        .get_player_mut(player_id)
        .ok_or_else(|| ActionError::Illegal("player not found".into()))?;

    player
        .mana_pool
        .try_pay(&mana_cost, mana_payment)
        .map_err(|e| ActionError::Illegal(e.to_string()))?;

    // CR 601.2a — Put the spell on the stack
    state.push_to_stack(StackEntry {
        kind: StackEntryKind::Spell { object_id },
        controller: player_id.to_string(),
        targets,
        mode_choices: vec![],
    });

    // Caster gets priority back after casting. CR 117.3b
    state.players_passed.clear();
    state.record_action();
    check_state_and_triggers(state);
    Ok(())
}

/// Play a land. CR 305.1
///
/// TODO: Some cards modify the number of lands a player can play per turn
/// (e.g., Exploration, Azusa, Lost but Seeking). This will need a
/// `lands_allowed_this_turn` field or continuous effect system.
///
/// TODO: Some cards allow playing lands from zones other than the hand
/// (e.g., Crucible of Worlds for graveyard, Vivien for exile). This will
/// need a check against all zones the player is allowed to play from.
pub fn play_land(
    state: &mut GameState,
    player_id: &str,
    object_id: u64,
) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    if !can_play_at_sorcery_speed(state, player_id) {
        return Err(ActionError::Illegal(
            "can only play lands at sorcery speed".into(),
        ));
    }

    // CR 305.2 — One land per turn (base rule)
    // TODO: account for effects that increase this limit
    if state.lands_played_this_turn >= 1 {
        return Err(ActionError::Illegal(
            "already played a land this turn".into(),
        ));
    }

    // TODO: check all zones the player is allowed to play lands from
    if !state.is_in_hand(player_id, object_id) {
        return Err(ActionError::Illegal("card is not in your hand".into()));
    }

    let is_land = state
        .objects
        .get(&object_id)
        .map(|c| c.definition.card_types.contains(&CardType::Land))
        .unwrap_or(false);

    if !is_land {
        return Err(ActionError::Illegal("card is not a land".into()));
    }

    enter_battlefield(state, object_id, ZoneType::Hand);
    state.lands_played_this_turn += 1;
    state.record_action();

    check_state_and_triggers(state);
    Ok(())
}

/// Concede the game.
pub fn concede(state: &mut GameState, player_id: &str) -> Result<(), ActionError> {
    validate_player(state, player_id)?;

    state.eliminate_player(player_id);
    state.record_action();

    if state.alive_count() <= 1 {
        state.status = GameStatus::Finished;
    }

    check_state_and_triggers(state);
    Ok(())
}

pub(crate) fn validate_player(state: &GameState, player_id: &str) -> Result<(), ActionError> {
    if !state.has_player(player_id) {
        return Err(ActionError::PlayerNotFound(player_id.to_string()));
    }
    Ok(())
}

#[cfg(test)]
mod tests;
#[cfg(test)]
mod tests_auto_pass;
#[cfg(test)]
mod tests_replacement;
#[cfg(test)]
mod tests_triggered;
