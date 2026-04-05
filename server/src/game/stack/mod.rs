use serde::{Deserialize, Serialize};

use super::card::{ObjectId, PlayerId};
use super::effect::Effect;

/// An entry on the stack — a spell or a triggered/activated ability.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StackEntry {
    pub kind: StackEntryKind,
    /// The player who cast the spell or controls the ability.
    pub controller: PlayerId,
    /// CR 601.2c — Targets chosen when put on the stack.
    pub targets: Vec<SpellTarget>,
    /// CR 601.2b — Modal choices (e.g., "choose one").
    pub mode_choices: Vec<u32>,
}

/// What kind of thing is on the stack.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StackEntryKind {
    /// A spell (card on the stack). The card moves zones.
    Spell { object_id: ObjectId },
    /// A triggered or activated ability. The source stays where it is.
    Ability { source_id: ObjectId, effect: Effect },
}

/// A target for a spell or ability on the stack.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SpellTarget {
    Player(PlayerId),
    Object(ObjectId),
}

/// CR 405 — The stack. Ordered, top = last element.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Stack {
    entries: Vec<StackEntry>,
}

impl Stack {
    pub fn push(&mut self, entry: StackEntry) {
        self.entries.push(entry);
    }

    /// Remove and return the top entry (last in, first out).
    pub fn pop(&mut self) -> Option<StackEntry> {
        self.entries.pop()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn contains(&self, object_id: &ObjectId) -> bool {
        self.entries.iter().any(|e| match &e.kind {
            StackEntryKind::Spell { object_id: oid } => oid == object_id,
            StackEntryKind::Ability { source_id, .. } => source_id == object_id,
        })
    }

    /// Remove an entry by object ID (e.g., when a spell is countered).
    pub fn remove(&mut self, object_id: &ObjectId) {
        self.entries.retain(|e| match &e.kind {
            StackEntryKind::Spell { object_id: oid } => oid != object_id,
            StackEntryKind::Ability { source_id, .. } => source_id != object_id,
        });
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Peek at the top entry without removing it.
    pub fn top(&self) -> Option<&StackEntry> {
        self.entries.last()
    }
}
