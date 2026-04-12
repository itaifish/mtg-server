use std::collections::{HashMap, HashSet};

use rand::SeedableRng;
use rand_chacha::ChaCha8Rng;
use serde::{Deserialize, Serialize};

use crate::game::phases_and_steps::{BeginningStep, EndingStep};

use super::card::{CardInstance, CardType, ObjectId, PlayerId};
use super::event::{trigger_matches, GameEvent, PendingTrigger};
use super::mana::{ManaPool, ManaRestriction, ManaType};
use super::phases_and_steps::Phase;
use super::stack::{Stack, StackEntry, StackEntryKind};
use super::zone::ZoneType;

/// Top-level game state. Contains all information needed to represent a game
/// at a point in time.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub game_id: String,
    pub name: String,
    pub status: GameStatus,
    pub players: Vec<Player>,
    /// The original turn order set at game start. Never changes.
    pub starting_turn_order: Vec<PlayerId>,
    /// Living players in turn order. Updated when a player is eliminated.
    pub living_turn_order: Vec<PlayerId>,
    /// Index into `living_turn_order` for the active player. CR 102.1
    pub active_player_index: usize,
    /// Index into `living_turn_order` for the player with priority. CR 117
    pub priority_index: usize,
    /// Players who have passed priority in succession since the last action
    /// or stack change. When all living players pass, the top of the stack
    /// resolves (or the phase advances if stack is empty).
    pub players_passed: HashSet<PlayerId>,
    /// Triggered abilities waiting to be put on the stack.
    /// Grouped by controller — each player orders their own triggers.
    pub pending_triggers: Vec<PendingTrigger>,
    pub turn_number: u32,
    pub phase: Phase,
    /// CR 400.1 — Per-player zones (library, hand, graveyard) keyed by player id.
    pub player_zones: HashMap<PlayerId, PlayerZones>,
    /// CR 400.5 — Battlefield is unordered. Shared by all players.
    pub battlefield: HashSet<ObjectId>,
    /// CR 405 — The stack.
    pub stack: Stack,
    /// CR 400.5 — Exile is unordered. Shared by all players.
    pub exile: HashSet<ObjectId>,
    /// CR 400.5 — Command zone is unordered. Shared by all players.
    pub command: HashSet<ObjectId>,
    /// All card instances in the game, keyed by ObjectId.
    pub objects: HashMap<ObjectId, CardInstance>,
    /// Monotonically increasing counter for generating unique ObjectIds.
    pub next_object_id: ObjectId,
    /// The RNG for deterministic replay
    pub rng: ChaCha8Rng,
    /// Number of actions applied to this game state.
    pub action_count: u64,
    /// Number of lands the active player has played this turn. CR 305.2
    pub lands_played_this_turn: u32,
    /// Current combat state, if in a combat phase.
    pub combat: Option<CombatState>,
    /// CR 103.1 — The player randomly chosen to decide who goes first.
    pub play_order_chooser: Option<PlayerId>,
}

/// Tracks the state of an ongoing combat.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatState {
    /// CR 508 — Each attacker and what it's attacking.
    pub attackers: Vec<AttackerInfo>,
    /// CR 509 — Each blocker and which attacker it's blocking.
    pub blockers: Vec<BlockerInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttackerInfo {
    pub object_id: ObjectId,
    pub target: AttackTarget,
}

/// CR 508.1b — What an attacker is attacking.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AttackTarget {
    Player(PlayerId),
    /// CR 306 — Planeswalkers can be attacked.
    Planeswalker(ObjectId),
    /// CR 310.5 — Battles can be attacked.
    Battle(ObjectId),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockerInfo {
    pub object_id: ObjectId,
    pub blocking: ObjectId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: PlayerId,
    pub name: String,
    /// CR 119.1 — Each player begins the game with a starting life total.
    pub life_total: i32,
    /// CR 104.3a — Whether this player has lost.
    pub has_lost: bool,
    /// Poison counters. CR 704.5c
    pub poison_counters: u32,
    /// Lobby and mulligan state.
    pub pregame: PregameInfo,
    /// CR 106.4 — Mana pool. Empties at the end of each step and phase.
    pub mana_pool: ManaPool,
    /// Auto-pass mode — server automatically passes priority for this player
    /// until the stop condition is met.
    pub auto_pass: AutoPassMode,
    /// CR 107.14 — Energy counters.
    pub energy: u32,
}

/// Controls when the server auto-passes priority for a player.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum AutoPassMode {
    /// No auto-pass — player must explicitly pass each time.
    #[default]
    None,
    /// Pass until a specific phase/step is reached.
    UntilPhase(Phase),
    /// Pass unless something is added to the stack or the turn changes.
    /// Stores the turn number when auto-pass was set.
    UntilStackOrTurn { set_on_turn: u32 },
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct PregameInfo {
    pub ready: bool,
    pub mulligan_count: u32,
    pub has_kept: bool,
}

impl Player {
    pub fn new(id: impl Into<PlayerId>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            life_total: 20,
            has_lost: false,
            poison_counters: 0,
            pregame: PregameInfo::default(),
            mana_pool: ManaPool::default(),
            auto_pass: AutoPassMode::None,
            energy: 0,
        }
    }
}

/// Per-player zones. CR 400.1 — Each player has their own library, hand, and
/// graveyard.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerZones {
    /// CR 401 — Library is ordered (top = last element). CR 400.5
    pub library: Vec<ObjectId>,
    /// CR 402 — Hand is unordered per rules.
    pub hand: HashSet<ObjectId>,
    /// CR 404 — Graveyard is ordered (top = last element). CR 400.5, 404.2
    pub graveyard: Vec<ObjectId>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GameStatus {
    WaitingForPlayers,
    /// A randomly chosen player is deciding play order.
    ChoosingPlayOrder,
    ResolvingMulligans,
    InProgress,
    Finished,
}

impl GameState {
    /// Create a new game with the given players.
    pub fn new(
        game_id: impl Into<String>,
        name: impl Into<String>,
        players: Vec<Player>,
        rng_seed: u64,
    ) -> Self {
        let player_ids: Vec<PlayerId> = players.iter().map(|p| p.id.clone()).collect();
        let mut player_zones = HashMap::new();
        for player in &players {
            player_zones.insert(
                player.id.clone(),
                PlayerZones {
                    library: vec![],
                    hand: HashSet::new(),
                    graveyard: vec![],
                },
            );
        }
        Self {
            game_id: game_id.into(),
            name: name.into(),
            status: GameStatus::WaitingForPlayers,
            players,
            starting_turn_order: player_ids.clone(),
            living_turn_order: player_ids,
            active_player_index: 0,
            priority_index: 0,
            players_passed: HashSet::new(),
            pending_triggers: vec![],
            turn_number: 0,
            phase: Phase::Beginning(BeginningStep::Untap),
            player_zones,
            battlefield: HashSet::new(),
            stack: Stack::default(),
            exile: HashSet::new(),
            command: HashSet::new(),
            objects: HashMap::new(),
            next_object_id: 1,
            rng: ChaCha8Rng::seed_from_u64(rng_seed),
            action_count: 0,
            lands_played_this_turn: 0,
            combat: None,
            play_order_chooser: None,
        }
    }
    /// Get the active player. CR 102.1
    pub fn active_player(&self) -> &Player {
        let id = &self.living_turn_order[self.active_player_index];
        self.get_player(id).expect("active player must exist")
    }

    /// Get the player who currently has priority. CR 117
    pub fn priority_player(&self) -> &Player {
        let id = &self.living_turn_order[self.priority_index];
        self.get_player(id).expect("priority player must exist")
    }

    /// Returns true if the given player has priority.
    pub fn has_priority(&self, player_id: &str) -> bool {
        self.status == GameStatus::InProgress && self.priority_player().id == player_id
    }

    /// Check if the player with priority should auto-pass.
    pub fn should_auto_pass(&self, player_id: &str) -> bool {
        let player = match self.get_player(player_id) {
            Some(p) => p,
            None => return false,
        };
        match &player.auto_pass {
            AutoPassMode::None => false,
            AutoPassMode::UntilPhase(target_phase) => self.phase != *target_phase,
            AutoPassMode::UntilStackOrTurn { set_on_turn } => {
                self.stack.is_empty() && self.turn_number == *set_on_turn
            }
        }
    }

    /// Clear auto-pass for a player.
    pub fn clear_auto_pass(&mut self, player_id: &str) {
        if let Some(player) = self.get_player_mut(player_id) {
            player.auto_pass = AutoPassMode::None;
        }
    }

    /// Set auto-pass mode for a player.
    pub fn set_auto_pass(&mut self, player_id: &str, mode: AutoPassMode) {
        if let Some(player) = self.get_player_mut(player_id) {
            player.auto_pass = mode;
        }
    }

    /// CR 117.3b — After a player takes an action, they receive priority again.
    /// Resets the passed set so the round of passing starts over.
    pub fn reset_priority_to_active(&mut self) {
        self.priority_index = self.active_player_index;
        self.players_passed.clear();
    }

    /// CR 117.4 — Pass priority to the next living player in turn order.
    /// Returns true if all living players have now passed (round complete).
    pub fn pass_priority_to_next(&mut self, player_id: &str) -> bool {
        self.players_passed.insert(player_id.to_string());

        let all_passed = self
            .living_turn_order
            .iter()
            .all(|id| self.players_passed.contains(id));

        if !all_passed {
            self.priority_index = (self.priority_index + 1) % self.living_turn_order.len();
        }

        all_passed
    }

    /// Find which zone an object is in.
    pub fn find_zone(&self, object_id: ObjectId) -> Option<(ZoneType, Option<&PlayerId>)> {
        if self.battlefield.contains(&object_id) {
            return Some((ZoneType::Battlefield, None));
        }
        if self.stack.contains(&object_id) {
            return Some((ZoneType::Stack, None));
        }
        if self.exile.contains(&object_id) {
            return Some((ZoneType::Exile, None));
        }
        if self.command.contains(&object_id) {
            return Some((ZoneType::Command, None));
        }
        for (player_id, zones) in &self.player_zones {
            if zones.library.contains(&object_id) {
                return Some((ZoneType::Library, Some(player_id)));
            }
            if zones.hand.contains(&object_id) {
                return Some((ZoneType::Hand, Some(player_id)));
            }
            if zones.graveyard.contains(&object_id) {
                return Some((ZoneType::Graveyard, Some(player_id)));
            }
        }
        None
    }

    /// Move an object between zones.
    /// CR 400.3 — Per-player zones always use the object's owner.
    /// CR 400.7 — An object that moves from one zone to another becomes a new
    /// object with no memory of its previous existence.
    pub fn move_object(&mut self, object_id: ObjectId, to_zone: ZoneType) {
        let from_zone = self.find_zone_type(object_id);
        self.remove_from_current_zone(object_id);

        match to_zone {
            ZoneType::Battlefield => {
                self.battlefield.insert(object_id);
            }
            ZoneType::Stack => {
                panic!("use push_to_stack() instead of move_object for stack")
            }
            ZoneType::Exile => {
                self.exile.insert(object_id);
            }
            ZoneType::Command => {
                self.command.insert(object_id);
            }
            ZoneType::Library | ZoneType::Hand | ZoneType::Graveyard => {
                let player_id = self
                    .objects
                    .get(&object_id)
                    .map(|o| o.owner.clone())
                    .expect("object must have an owner");
                let zones = self
                    .player_zones
                    .get_mut(&player_id)
                    .expect("player zones must exist");
                match to_zone {
                    ZoneType::Library => zones.library.push(object_id),
                    ZoneType::Hand => {
                        zones.hand.insert(object_id);
                    }
                    ZoneType::Graveyard => zones.graveyard.push(object_id),
                    _ => unreachable!(),
                }
            }
        }

        // Emit zone change event
        let card = self.objects.get(&object_id);
        let owner = card.map(|c| c.owner.clone()).unwrap_or_default();
        let controller = card.and_then(|c| c.controller.clone());
        let from = from_zone.unwrap_or(ZoneType::Library);
        let to = to_zone;
        self.emit_event(&GameEvent::ZoneChange {
            object_id,
            from,
            to,
            owner,
            controller,
        });
    }

    /// Find which zone type an object is currently in.
    fn find_zone_type(&self, object_id: ObjectId) -> Option<ZoneType> {
        if self.battlefield.contains(&object_id) {
            return Some(ZoneType::Battlefield);
        }
        if self.stack.contains(&object_id) {
            return Some(ZoneType::Stack);
        }
        if self.exile.contains(&object_id) {
            return Some(ZoneType::Exile);
        }
        if self.command.contains(&object_id) {
            return Some(ZoneType::Command);
        }
        for (_, zones) in &self.player_zones {
            if zones.library.contains(&object_id) {
                return Some(ZoneType::Library);
            }
            if zones.hand.contains(&object_id) {
                return Some(ZoneType::Hand);
            }
            if zones.graveyard.contains(&object_id) {
                return Some(ZoneType::Graveyard);
            }
        }
        None
    }

    fn remove_from_current_zone(&mut self, object_id: ObjectId) {
        self.battlefield.remove(&object_id);
        self.stack.remove(&object_id);
        self.exile.remove(&object_id);
        self.command.remove(&object_id);
        for zones in self.player_zones.values_mut() {
            zones.library.retain(|&id| id != object_id);
            zones.hand.remove(&object_id);
            zones.graveyard.retain(|&id| id != object_id);
        }
    }

    /// Allocate a new unique ObjectId.
    pub fn new_object_id(&mut self) -> ObjectId {
        let id = self.next_object_id;
        self.next_object_id += 1;
        id
    }

    /// Returns true if the given player exists in this game.
    pub fn has_player(&self, player_id: &str) -> bool {
        self.players.iter().any(|p| p.id == player_id)
    }

    /// Returns true if the card is in the given player's hand.
    pub fn is_in_hand(&self, player_id: &str, object_id: ObjectId) -> bool {
        self.player_zones
            .get(player_id)
            .map(|z| z.hand.contains(&object_id))
            .unwrap_or(false)
    }

    /// Mark a player as having lost and remove all objects they own/control
    /// from the game. CR 800.4a — When a player leaves the game, all objects
    /// owned by that player leave the game, all spells and abilities controlled
    /// by that player on the stack cease to exist, and all emblems controlled
    /// by that player cease to exist.
    pub fn eliminate_player(&mut self, player_id: &str) {
        if let Some(player) = self.players.iter_mut().find(|p| p.id == player_id) {
            player.has_lost = true;
        }

        // Remove from living turn order
        self.living_turn_order.retain(|id| id != player_id);

        // Fix indices if they're now out of bounds
        if !self.living_turn_order.is_empty() {
            self.active_player_index = self.active_player_index % self.living_turn_order.len();
            self.priority_index = self.priority_index % self.living_turn_order.len();
        }

        // Remove all objects owned by this player from every zone
        let owned_ids: Vec<ObjectId> = self
            .objects
            .iter()
            .filter(|(_, card)| card.owner == player_id)
            .map(|(&id, _)| id)
            .collect();

        for id in &owned_ids {
            self.remove_from_current_zone(*id);
            self.objects.remove(id);
        }

        // TODO: handle controlled-but-not-owned permanents via SBA

        self.player_zones.remove(player_id);
    }

    /// Count players who have not lost.
    pub fn alive_count(&self) -> usize {
        self.living_turn_order.len()
    }

    /// Advance to the next phase/step, or the next turn if at end of turn.
    /// Handles step-specific actions (untap, draw, cleanup). CR 500
    pub fn advance_phase(&mut self) {
        self.empty_mana_pools();
        if let Some(next) = self.phase.next() {
            tracing::info!(
                "Advancing phase from {:#?} to {:#?}",
                self.phase,
                self.phase.next()
            );
            self.phase = next;
            self.on_phase_enter();
        } else {
            tracing::info!("Advancing turn");
            self.advance_turn();
        }
        self.reset_priority_to_active();

        // CR 514.3 — No player receives priority during cleanup unless a
        // triggered ability goes on the stack.
        if matches!(self.phase, Phase::Ending(EndingStep::Cleanup))
            && self.pending_triggers.is_empty()
        {
            self.advance_phase();
        }
    }
    fn on_phase_enter(&mut self) {
        let active_id = self.active_player().id.clone();
        match self.phase {
            // CR 502.3 — Untap all permanents the active player controls.
            Phase::Beginning(BeginningStep::Untap) => {
                tracing::info!("Untapping permanents");
                let to_untap: Vec<ObjectId> = self
                    .battlefield
                    .iter()
                    .filter(|id| {
                        self.objects
                            .get(id)
                            .map(|c| c.controller.as_deref() == Some(&active_id))
                            .unwrap_or(false)
                    })
                    .copied()
                    .collect();
                for id in to_untap {
                    if let Some(card) = self.objects.get_mut(&id) {
                        card.tapped = false;
                        card.summoning_sick = false;
                    }
                }
            }
            // CR 504.1 — Active player draws a card.
            // CR 103.8 — The player who goes first skips the draw step of
            // their first turn.
            Phase::Beginning(BeginningStep::Draw) => {
                let skip = self.turn_number == 1 && self.active_player_index == 0;
                if !skip {
                    self.draw_card(&active_id);
                }
            }
            // CR 514.2 — Remove all damage from permanents, end "until end
            // of turn" and "this turn" effects.
            Phase::Ending(EndingStep::Cleanup) => {
                for id in self.battlefield.clone() {
                    if let Some(card) = self.objects.get_mut(&id) {
                        card.damage_marked = 0;
                    }
                }
                // TODO: end "until end of turn" effects
            }
            _ => {}
        }
    }

    /// Advance to the next player's turn. Resets per-turn state.
    pub fn advance_turn(&mut self) {
        self.active_player_index = (self.active_player_index + 1) % self.living_turn_order.len();
        self.turn_number += 1;
        self.phase = Phase::Beginning(BeginningStep::Untap);
        self.lands_played_this_turn = 0;
        self.on_phase_enter();
        self.reset_priority_to_active();
    }

    /// Record that an action was taken.
    pub fn record_action(&mut self) {
        self.action_count += 1;
    }

    /// Emit a game event and collect any triggered abilities that match.
    /// Triggers are added to `pending_triggers` for the controller to
    /// order and choose targets before they go on the stack.
    pub fn emit_event(&mut self, event: &GameEvent) {
        let zone_for_event = |zone_type: &ZoneType| -> ZoneType {
            match zone_type {
                ZoneType::Battlefield => ZoneType::Battlefield,
                ZoneType::Graveyard => ZoneType::Graveyard,
                ZoneType::Hand => ZoneType::Hand,
                ZoneType::Library => ZoneType::Library,
                ZoneType::Stack => ZoneType::Stack,
                ZoneType::Exile => ZoneType::Exile,
                ZoneType::Command => ZoneType::Command,
            }
        };

        // Check all objects for triggered abilities that match this event.
        // Only check objects in the zone their trigger is registered for.
        let mut new_triggers = vec![];

        // Collect from battlefield
        for &obj_id in &self.battlefield.clone() {
            if let Some(card) = self.objects.get(&obj_id) {
                let controller = card
                    .controller
                    .clone()
                    .unwrap_or_else(|| card.owner.clone());
                for trigger in card.definition.abilities.triggered_in(ZoneType::Battlefield) {
                    if trigger_matches(trigger, event, obj_id, &controller, &self.objects) {
                        new_triggers.push(PendingTrigger {
                            source_id: obj_id,
                            controller: controller.clone(),
                            effect: trigger.effect.clone(),
                            needs_targets: trigger.needs_targets,
                            description: trigger.description.clone(),
                        });
                    }
                }
            }
        }

        // Collect from graveyards
        for (player_id, zones) in &self.player_zones.clone() {
            for &obj_id in &zones.graveyard {
                if let Some(card) = self.objects.get(&obj_id) {
                    for trigger in card.definition.abilities.triggered_in(ZoneType::Graveyard) {
                        if trigger_matches(trigger, event, obj_id, player_id, &self.objects) {
                            new_triggers.push(PendingTrigger {
                                source_id: obj_id,
                                controller: player_id.clone(),
                                effect: trigger.effect.clone(),
                                needs_targets: trigger.needs_targets,
                                description: trigger.description.clone(),
                            });
                        }
                    }
                }
            }
        }

        self.pending_triggers.extend(new_triggers);
    }

    /// Get a reference to a player by ID.
    pub fn get_player(&self, player_id: &str) -> Option<&Player> {
        self.players.iter().find(|p| p.id == player_id)
    }

    /// Get a mutable reference to a player by ID.
    pub fn get_player_mut(&mut self, player_id: &str) -> Option<&mut Player> {
        self.players.iter_mut().find(|p| p.id == player_id)
    }

    /// CR 106.4 — Empty all players' mana pools. Called on phase/step transitions.
    pub fn empty_mana_pools(&mut self) {
        for player in &mut self.players {
            player.mana_pool.clear();
        }
    }

    /// CR 106 — Add mana to a player's pool.
    /// TODO: replacement effects (e.g., Mana Reflection doubles mana)
    /// TODO: triggered abilities on mana production
    pub fn add_mana(&mut self, player_id: &str, mana_type: ManaType, amount: u32) {
        if let Some(player) = self.get_player_mut(player_id) {
            player.mana_pool.add(mana_type, amount);
        }
    }

    /// Add restricted mana to a player's pool.
    pub fn add_mana_restricted(
        &mut self,
        player_id: &str,
        mana_type: ManaType,
        amount: u32,
        restriction: ManaRestriction,
    ) {
        if let Some(player) = self.get_player_mut(player_id) {
            player
                .mana_pool
                .add_restricted(mana_type, amount, restriction);
        }
    }

    // --- Game action helpers ---
    // Wrapped in helpers for future replacement effect and triggered ability support.

    /// CR 120 — Deal damage to a player.
    /// TODO: replacement/prevention effects (e.g., Fog, damage doublers)
    /// TODO: triggered abilities (e.g., Lifelink, Curiosity)
    pub fn deal_damage_to_player(&mut self, player_id: &str, amount: u32) {
        if let Some(player) = self.get_player_mut(player_id) {
            player.life_total -= amount as i32;
        }
        self.emit_event(&GameEvent::LifeLost {
            player_id: player_id.to_string(),
            amount,
        });
    }

    /// CR 121 — A player draws a card (moves top of library to hand).
    pub fn draw_card(&mut self, player_id: &str) -> bool {
        let zones = match self.player_zones.get_mut(player_id) {
            Some(z) => z,
            None => return false,
        };
        match zones.library.pop() {
            Some(id) => {
                zones.hand.insert(id);
                self.emit_event(&GameEvent::CardDrawn {
                    player_id: player_id.to_string(),
                });
                true
            }
            None => false,
        }
    }

    /// CR 119.3 — A player gains life.
    pub fn gain_life(&mut self, player_id: &str, amount: u32) {
        if let Some(player) = self.get_player_mut(player_id) {
            player.life_total += amount as i32;
        }
        self.emit_event(&GameEvent::LifeGained {
            player_id: player_id.to_string(),
            amount,
        });
    }

    /// CR 107.14 — Give energy counters to a player.
    pub fn gain_energy(&mut self, player_id: &str, amount: u32) {
        if let Some(player) = self.get_player_mut(player_id) {
            player.energy += amount;
        }
    }

    /// CR 107.14 — Spend energy counters. Returns false if insufficient.
    pub fn pay_energy(&mut self, player_id: &str, amount: u32) -> bool {
        if let Some(player) = self.get_player_mut(player_id) {
            if player.energy >= amount {
                player.energy -= amount;
                return true;
            }
        }
        false
    }

    /// Move an object to its owner's graveyard.
    /// TODO: replacement effects (e.g., Rest in Peace exiles instead)
    /// TODO: triggered abilities (e.g., Blood Artist)
    pub fn send_to_graveyard(&mut self, object_id: ObjectId) {
        self.move_object(object_id, ZoneType::Graveyard);
    }

    /// Put a spell or ability on the stack with its targets and controller.
    pub fn push_to_stack(&mut self, entry: StackEntry) {
        // Only spells move zones — abilities stay where they are
        if let StackEntryKind::Spell { object_id } = &entry.kind {
            self.remove_from_current_zone(*object_id);
        }
        self.stack.push(entry);
    }

    /// Get all object IDs on the battlefield with a given card type.
    pub fn battlefield_of_type(&self, card_type: CardType) -> Vec<ObjectId> {
        self.battlefield
            .iter()
            .filter(|id| {
                self.objects
                    .get(id)
                    .map(|c| c.definition.card_types.contains(&card_type))
                    .unwrap_or(false)
            })
            .copied()
            .collect()
    }
}

#[cfg(test)]
pub mod tests_helper;

#[cfg(test)]
mod tests;
