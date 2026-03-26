use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::game::card::CardType;
use crate::game::phases_and_steps::BeginningStep;

use super::card::{CardInstance, ObjectId, PlayerId};
use super::mana::{ManaPool, ManaRestriction, ManaType};
use super::phases_and_steps::Phase;
use super::zone::ZoneType;

/// Top-level game state. Contains all information needed to represent a game
/// at a point in time.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameState {
    pub game_id: String,
    pub status: GameStatus,
    pub players: Vec<Player>,
    /// Turn order — indices into `players`. CR 103.1
    pub turn_order: Vec<usize>,
    /// Index into `turn_order` for the active player. CR 102.1
    pub active_player_index: usize,
    pub turn_number: u32,
    pub phase: Phase,
    /// CR 400.1 — Per-player zones (library, hand, graveyard) keyed by player id.
    pub player_zones: HashMap<PlayerId, PlayerZones>,
    /// CR 400.5 — Battlefield is unordered. Shared by all players.
    pub battlefield: HashSet<ObjectId>,
    /// CR 400.5 — Stack is ordered (top = last element). Shared by all players.
    pub stack: Vec<ObjectId>,
    /// CR 400.5 — Exile is unordered. Shared by all players.
    pub exile: HashSet<ObjectId>,
    /// CR 400.5 — Command zone is unordered. Shared by all players.
    pub command: HashSet<ObjectId>,
    /// All card instances in the game, keyed by ObjectId.
    pub objects: HashMap<ObjectId, CardInstance>,
    /// Monotonically increasing counter for generating unique ObjectIds.
    pub next_object_id: ObjectId,
    /// The RNG seed for deterministic replay (design decision D8).
    pub rng_seed: u64,
    /// Number of actions applied to this game state.
    pub action_count: u64,
    /// Number of lands the active player has played this turn. CR 305.2
    pub lands_played_this_turn: u32,
    /// Current combat state, if in a combat phase.
    pub combat: Option<CombatState>,
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
    /// CR 106.4 — Mana pool. Empties at the end of each step and phase.
    pub mana_pool: ManaPool,
}

impl Player {
    pub fn new(id: impl Into<PlayerId>, name: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            life_total: 20,
            has_lost: false,
            poison_counters: 0,
            mana_pool: ManaPool::default(),
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
    InProgress,
    Finished,
}

impl GameState {
    /// Create a new game with the given players.
    pub fn new(game_id: impl Into<String>, players: Vec<Player>, rng_seed: u64) -> Self {
        let turn_order: Vec<usize> = (0..players.len()).collect();
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
            status: GameStatus::WaitingForPlayers,
            players,
            turn_order,
            active_player_index: 0,
            turn_number: 0,
            phase: Phase::Beginning(BeginningStep::Untap),
            player_zones,
            battlefield: HashSet::new(),
            stack: vec![],
            exile: HashSet::new(),
            command: HashSet::new(),
            objects: HashMap::new(),
            next_object_id: 1,
            rng_seed,
            action_count: 0,
            lands_played_this_turn: 0,
            combat: None,
        }
    }
    /// Get the active player. CR 102.1
    pub fn active_player(&self) -> &Player {
        &self.players[self.turn_order[self.active_player_index]]
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
        self.remove_from_current_zone(object_id);

        match to_zone {
            ZoneType::Battlefield => {
                self.battlefield.insert(object_id);
            }
            ZoneType::Stack => self.stack.push(object_id),
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
    }

    fn remove_from_current_zone(&mut self, object_id: ObjectId) {
        self.battlefield.remove(&object_id);
        self.stack.retain(|&id| id != object_id);
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

    /// Returns true if the given player has priority (i.e., is the active player).
    pub fn has_priority(&self, player_id: &str) -> bool {
        self.active_player().id == player_id
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

        // Remove objects controlled (but not owned) by this player from the
        // stack — CR 800.4a spells/abilities controlled by the player cease
        // to exist. Permanents they control but don't own return to their
        // owner (handled by state-based actions).
        // TODO: handle controlled-but-not-owned permanents via SBA

        self.player_zones.remove(player_id);
    }

    /// Count players who have not lost.
    pub fn alive_count(&self) -> usize {
        self.players.iter().filter(|p| !p.has_lost).count()
    }

    /// Advance to the next player's turn. Resets per-turn state.
    pub fn advance_turn(&mut self) {
        // Skip eliminated players
        loop {
            self.active_player_index = (self.active_player_index + 1) % self.turn_order.len();
            if !self.active_player().has_lost {
                break;
            }
        }
        self.turn_number += 1;
        self.phase = Phase::Beginning(BeginningStep::Untap);
        self.lands_played_this_turn = 0;
    }

    /// Record that an action was taken.
    pub fn record_action(&mut self) {
        self.action_count += 1;
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
    }

    /// CR 121 — A player draws a card (moves top of library to hand).
    /// TODO: replacement effects (e.g., Notion Thief, Alms Collector)
    /// TODO: triggered abilities (e.g., Consecrated Sphinx)
    pub fn draw_card(&mut self, player_id: &str) -> bool {
        let zones = match self.player_zones.get_mut(player_id) {
            Some(z) => z,
            None => return false,
        };
        match zones.library.pop() {
            Some(id) => {
                zones.hand.insert(id);
                true
            }
            None => false,
        }
    }

    /// CR 119.3 — A player gains life.
    /// TODO: replacement effects (e.g., Tainted Remedy)
    /// TODO: triggered abilities (e.g., Ajani's Pridemate)
    pub fn gain_life(&mut self, player_id: &str, amount: u32) {
        if let Some(player) = self.get_player_mut(player_id) {
            player.life_total += amount as i32;
        }
    }

    /// Move an object to its owner's graveyard.
    /// TODO: replacement effects (e.g., Rest in Peace exiles instead)
    /// TODO: triggered abilities (e.g., Blood Artist)
    pub fn send_to_graveyard(&mut self, object_id: ObjectId) {
        self.move_object(object_id, ZoneType::Graveyard);
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
