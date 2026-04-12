use crate::game::card::PlayerId;
use crate::game::event::PendingTrigger;
use crate::game::stack::{StackEntry, StackEntryKind};
use crate::game::state::GameState;

/// Process pending triggers: group by controller, check if ordering input
/// is needed, and put them on the stack in APNAP order.
///
/// Returns the player ID that needs to order their triggers, if any.
/// If `None`, all triggers were auto-ordered and placed on the stack.
pub fn process_pending_triggers(state: &mut GameState) -> Option<PlayerId> {
    if state.pending_triggers.is_empty() {
        return None;
    }

    // Group triggers by controller in APNAP order
    let mut by_controller: Vec<(PlayerId, Vec<PendingTrigger>)> = vec![];
    for player_id in &state.living_turn_order.clone() {
        let player_triggers: Vec<PendingTrigger> = state
            .pending_triggers
            .iter()
            .filter(|t| t.controller == *player_id)
            .cloned()
            .collect();
        if !player_triggers.is_empty() {
            by_controller.push((player_id.clone(), player_triggers));
        }
    }

    // For each player's group, check if ordering matters
    for (player_id, triggers) in by_controller {
        if needs_ordering(&triggers) {
            // Player needs to choose order — leave triggers in pending
            // and return the player who needs to act.
            // TODO: add a game state field to track who we're waiting on
            // for trigger ordering, and a SubmitAction variant to submit
            // the ordering.
            // For now, just put them on in the order they were collected.
            put_triggers_on_stack(state, &triggers);
        } else {
            // All identical or single trigger — auto-order
            put_triggers_on_stack(state, &triggers);
        }
    }

    state.pending_triggers.clear();
    None
}

/// Check if a set of triggers from the same controller needs player input
/// to determine ordering. If all triggers have the same effect and neither
/// needs targets, ordering doesn't matter.
fn needs_ordering(triggers: &[PendingTrigger]) -> bool {
    if triggers.len() <= 1 {
        return false;
    }

    // If any trigger needs targets, player must order (target choice may differ)
    if triggers.iter().any(|t| t.needs_targets) {
        return true;
    }

    // If all effects are identical, ordering doesn't matter
    let first = &triggers[0].description;
    !triggers.iter().all(|t| t.description == *first)
}

/// Put triggers on the stack as entries. Last in the list goes on top
/// (resolves first), matching APNAP: active player's triggers go on first
/// (bottom), so they resolve last.
fn put_triggers_on_stack(state: &mut GameState, triggers: &[PendingTrigger]) {
    for trigger in triggers {
        state.stack.push(StackEntry {
            kind: StackEntryKind::Ability {
                source_id: trigger.source_id,
                effect: trigger.effect.clone(),
                description: trigger.description.clone(),
            },
            controller: trigger.controller.clone(),
            targets: vec![],
            mode_choices: vec![],
        });
    }
}

#[cfg(test)]
mod tests;
