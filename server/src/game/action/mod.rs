use serde::{Deserialize, Serialize};

use super::card::{ObjectId, PlayerId};
use super::mana::ManaPayment;

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
    PlayLand { object_id: ObjectId },

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
    MakeChoice { choice: PlayerChoice },

    /// Concede the game.
    Concede,
}

/// A target for a spell or ability. CR 115
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Target {
    Object(ObjectId),
    Player(PlayerId),
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
