use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use crate::game::phases_and_steps::BeginningStep;

use super::card::{CardInstance, ObjectId, PlayerId};
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
    /// Get the active player. CR 102.1
    pub fn active_player(&self) -> &Player {
        &self.players[self.turn_order[self.active_player_index]]
    }

    /// Find which zone an object is in.
    pub fn find_zone(&self, object_id: ObjectId) -> Option<(ZoneType, Option<&PlayerId>)> {
        if self.battlefield.contains(&object_id) {
            return Some((ZoneType::Battlefield, None));
        }
        if self.stack.iter().any(|&id| id == object_id) {
            return Some((ZoneType::Stack, None));
        }
        if self.exile.contains(&object_id) {
            return Some((ZoneType::Exile, None));
        }
        if self.command.contains(&object_id) {
            return Some((ZoneType::Command, None));
        }
        for (player_id, zones) in &self.player_zones {
            if zones.library.iter().any(|&id| id == object_id) {
                return Some((ZoneType::Library, Some(player_id)));
            }
            if zones.hand.contains(&object_id) {
                return Some((ZoneType::Hand, Some(player_id)));
            }
            if zones.graveyard.iter().any(|&id| id == object_id) {
                return Some((ZoneType::Graveyard, Some(player_id)));
            }
        }
        None
    }

    /// Move an object between zones.
    /// CR 400.7 — An object that moves from one zone to another becomes a new
    /// object with no memory of its previous existence.
    pub fn move_object(
        &mut self,
        object_id: ObjectId,
        to_zone: ZoneType,
        to_player: Option<&PlayerId>,
    ) {
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
                // CR 400.3 — Goes to owner's zone if no player specified
                let player_id = to_player
                    .cloned()
                    .or_else(|| self.objects.get(&object_id).map(|o| o.owner.clone()))
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
}

#[cfg(test)]
pub mod tests_helper;

#[cfg(test)]
mod tests;
