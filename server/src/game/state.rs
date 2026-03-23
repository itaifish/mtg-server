use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

use super::card::{CardInstance, ObjectId, PlayerId};
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

/// CR 500.1 — A turn consists of five phases: beginning, precombat main,
/// combat, postcombat main, and ending.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Phase {
    /// CR 501
    Beginning(BeginningStep),
    /// CR 505 — First main phase.
    PrecombatMain,
    /// CR 506
    Combat(CombatStep),
    /// CR 505 — Second main phase.
    PostcombatMain,
    /// CR 512
    Ending(EndingStep),
}

/// CR 501 — The beginning phase has three steps: untap, upkeep, and draw.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BeginningStep {
    /// CR 502
    Untap,
    /// CR 503
    Upkeep,
    /// CR 504
    Draw,
}

/// CR 506 — The combat phase has five steps.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CombatStep {
    /// CR 507
    BeginningOfCombat,
    /// CR 508
    DeclareAttackers,
    /// CR 509
    DeclareBlockers,
    /// CR 510
    CombatDamage,
    /// CR 511
    EndOfCombat,
}

/// CR 512 — The ending phase has two steps: end and cleanup.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EndingStep {
    /// CR 513
    End,
    /// CR 514
    Cleanup,
}

/// An action recorded in the action log for deterministic replay.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameAction {
    pub sequence_number: u64,
    pub player_id: PlayerId,
    pub action: ActionType,
}

/// CR 117 — Actions a player can take. Each variant carries all information
/// needed to deterministically replay the action.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionType {
    /// Pass priority. CR 117.4
    PassPriority,

    /// Play a land. CR 305.1
    PlayLand {
        object_id: ObjectId,
    },

    /// Cast a spell. CR 601
    CastSpell {
        object_id: ObjectId,
        /// CR 601.2b — Targets chosen for the spell.
        targets: Vec<Target>,
        /// CR 601.2b — Modal choices (e.g., "choose one").
        mode_choices: Vec<u32>,
        /// CR 601.2f — Value of X if the spell has {X} in its cost.
        x_value: Option<u32>,
        /// CR 601.2g — How the mana cost is being paid.
        mana_payment: Vec<ManaPayment>,
        /// CR 601.2b — Any additional costs paid (e.g., kicker, buyback).
        additional_costs_paid: Vec<AdditionalCost>,
    },

    /// Activate an ability. CR 602
    ActivateAbility {
        source_id: ObjectId,
        /// Which ability on the object (index).
        ability_index: u32,
        targets: Vec<Target>,
        x_value: Option<u32>,
        mana_payment: Vec<ManaPayment>,
    },

    /// Declare attackers. CR 508
    DeclareAttackers {
        /// CR 508.1b — Each attacker and what it's attacking.
        assignments: Vec<AttackAssignment>,
    },

    /// Declare blockers. CR 509
    DeclareBlockers {
        /// CR 509.1a — Each blocker and which attacker(s) it blocks.
        /// A creature can block multiple attackers if it has an ability
        /// that allows it (e.g., "can block an additional creature").
        assignments: Vec<BlockAssignment>,
    },

    /// Order blockers for combat damage assignment. CR 510.1c
    OrderBlockers {
        attacker_id: ObjectId,
        /// Blocker ids in the order the attacker's controller chooses.
        blocker_order: Vec<ObjectId>,
    },

    /// Order attackers for combat damage assignment (when a creature blocks
    /// multiple attackers). CR 510.1d
    OrderAttackers {
        blocker_id: ObjectId,
        /// Attacker ids in the order the blocking player chooses.
        attacker_order: Vec<ObjectId>,
    },

    /// Make a choice when prompted by a spell or ability.
    MakeChoice {
        choice: PlayerChoice,
    },

    /// Concede the game.
    Concede,
}

/// A target for a spell or ability. CR 115
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Target {
    Object(ObjectId),
    Player(PlayerId),
}

/// How a single mana symbol in a cost is being paid.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManaPayment {
    /// Which mana source is producing the mana (e.g., a land's ObjectId).
    pub source_id: ObjectId,
    /// What color/type of mana is being produced.
    pub mana_type: ManaType,
}

/// CR 106 — Types of mana.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ManaType {
    White,
    Blue,
    Black,
    Red,
    Green,
    Colorless,
}

/// Additional costs beyond the mana cost. CR 118.8
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AdditionalCost {
    /// Sacrifice a permanent.
    Sacrifice(ObjectId),
    /// Discard a card.
    Discard(ObjectId),
    /// Pay life.
    PayLife(u32),
    /// Pay with Phyrexian mana (2 life instead of colored). CR 107.4f
    PhyrexianLife,
    /// Tap a permanent.
    Tap(ObjectId),
    /// Exile a card.
    ExileFromZone(ObjectId),
    /// Kicker or other optional additional cost.
    Kicker { mana_payment: Vec<ManaPayment> },
}

/// CR 508.1b — An attacker attacks a player, planeswalker, or battle.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttackAssignment {
    pub attacker_id: ObjectId,
    pub attacking: AttackTarget,
}

/// What an attacker is attacking. CR 508.1b
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AttackTarget {
    Player(PlayerId),
    /// CR 306 — Planeswalkers can be attacked.
    Planeswalker(ObjectId),
    /// CR 310.5 — Battles can be attacked.
    Battle(ObjectId),
}

/// CR 509.1a — A blocker and which attacker(s) it blocks.
/// Some creatures can block multiple attackers (e.g., "can block an additional
/// creature", "can block any number of creatures").
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockAssignment {
    pub blocker_id: ObjectId,
    pub blocking: Vec<ObjectId>,
}

/// Choices a player makes in response to spells, abilities, or game rules.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PlayerChoice {
    /// Choose one or more objects (e.g., "choose a creature").
    ChooseObjects(Vec<ObjectId>),
    /// Choose one or more players.
    ChoosePlayers(Vec<PlayerId>),
    /// Choose a number (e.g., for X, or "choose a number").
    ChooseNumber(u32),
    /// Choose from a list of options (e.g., modal spells, voting).
    ChooseOption(u32),
    /// Order objects (e.g., Scry ordering, Collected Company).
    OrderObjects(Vec<ObjectId>),
    /// Yes/No decision (e.g., "you may" effects).
    YesNo(bool),
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
            ZoneType::Battlefield => { self.battlefield.insert(object_id); }
            ZoneType::Stack => self.stack.push(object_id),
            ZoneType::Exile => { self.exile.insert(object_id); }
            ZoneType::Command => { self.command.insert(object_id); }
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
                    ZoneType::Hand => { zones.hand.insert(object_id); }
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
}
