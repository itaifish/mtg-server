use crate::game::ability::{all_activated, AbilityCost};
use crate::game::card::CardType;
use crate::game::phases_and_steps::{CombatStep, Phase};
use crate::game::state::GameState;
use crate::game::zone::ZoneType;

use super::actions::can_play_at_sorcery_speed;

/// A legal action a player can take.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LegalAction {
    PassPriority,
    PlayLand {
        object_id: u64,
    },
    CastSpell {
        object_id: u64,
        target_requirements: Vec<Vec<crate::game::effect::TargetKind>>,
        mana_cost_symbols: Vec<String>,
    },
    ActivateManaAbility {
        object_id: u64,
        ability_index: usize,
    },
    DeclareAttackers,
    DeclareBlockers,
    Concede,
}

/// Compute all legal actions for a player in the current game state.
pub fn for_player(state: &GameState, player_id: &str) -> Vec<LegalAction> {
    let mut actions = vec![LegalAction::Concede];

    if !state.has_priority(player_id) {
        return actions;
    }

    actions.push(LegalAction::PassPriority);

    let sorcery_speed = can_play_at_sorcery_speed(state, player_id);
    let is_active = state.active_player().id == player_id;

    // Mana abilities — can activate anytime you have priority
    for &obj_id in &state.battlefield {
        let card = match state.objects.get(&obj_id) {
            Some(c) => c,
            None => continue,
        };
        if card.controller.as_deref() != Some(player_id) {
            continue;
        }
        for (idx, ability) in all_activated(&card.definition, ZoneType::Battlefield).iter().enumerate() {
            if !ability.is_mana_ability {
                continue;
            }
            let can_pay = ability.costs.iter().all(|cost| match cost {
                AbilityCost::TapSelf => {
                    !card.tapped
                        && !(card.is_summoning_sick()
                            && card.definition.card_types.contains(&CardType::Creature))
                }
                _ => false,
            });
            if can_pay {
                actions.push(LegalAction::ActivateManaAbility {
                    object_id: obj_id,
                    ability_index: idx,
                });
            }
        }
    }

    // Play a land
    if sorcery_speed && state.lands_played_this_turn < 1 {
        if let Some(zones) = state.player_zones.get(player_id) {
            for &obj_id in &zones.hand {
                if let Some(card) = state.objects.get(&obj_id) {
                    if card.definition.card_types.contains(&CardType::Land) {
                        actions.push(LegalAction::PlayLand { object_id: obj_id });
                    }
                }
            }
        }
    }

    // Cast spells
    if let Some(zones) = state.player_zones.get(player_id) {
        for &obj_id in &zones.hand {
            let card = match state.objects.get(&obj_id) {
                Some(c) => c,
                None => continue,
            };
            if card.definition.mana_cost.is_none() {
                continue;
            }
            let is_instant = card.definition.card_types.contains(&CardType::Instant);
            if is_instant || sorcery_speed {
                let target_requirements = card
                    .definition
                    .spell_effect
                    .as_ref()
                    .map(|e| crate::game::effect::target_requirements(e))
                    .unwrap_or_default();
                let mana_cost_symbols = card
                    .definition
                    .mana_cost
                    .as_ref()
                    .map(|mc| mc.symbols.iter().map(|s| format!("{:?}", s)).collect())
                    .unwrap_or_default();
                actions.push(LegalAction::CastSpell {
                    object_id: obj_id,
                    target_requirements,
                    mana_cost_symbols,
                });
            }
        }
    }

    // Declare attackers — active player during declare attackers step
    if is_active && matches!(state.phase, Phase::Combat(CombatStep::DeclareAttackers)) {
        actions.push(LegalAction::DeclareAttackers);
    }

    // Declare blockers — defending player during declare blockers step
    if matches!(state.phase, Phase::Combat(CombatStep::DeclareBlockers)) {
        if let Some(combat) = &state.combat {
            let is_defending = combat.attackers.iter().any(|a| {
                matches!(&a.target, crate::game::state::AttackTarget::Player(pid) if pid == player_id)
            });
            if is_defending {
                actions.push(LegalAction::DeclareBlockers);
            }
        }
    }

    actions
}

#[cfg(test)]
mod tests;
