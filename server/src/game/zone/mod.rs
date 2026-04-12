use serde::{Deserialize, Serialize};

/// CR 400.1 — There are normally seven zones: library, hand, battlefield,
/// graveyard, stack, exile, and command.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ZoneType {
    /// Outside the game (e.g., tokens before creation).
    None,
    /// CR 401 — Hidden zone. Each player has their own library.
    Library,
    /// CR 402 — Hidden zone. Each player has their own hand.
    Hand,
    /// CR 403 — Public zone. Shared by all players.
    Battlefield,
    /// CR 404 — Public zone. Each player has their own graveyard.
    Graveyard,
    /// CR 405 — Public zone. Shared by all players.
    Stack,
    /// CR 406 — Public zone. Shared by all players.
    Exile,
    /// CR 408 — Public zone. Shared by all players.
    Command,
}

impl ZoneType {
    /// CR 400.2 — Public zones are zones in which all players can see the
    /// cards' faces. Graveyard, battlefield, stack, exile, and command are
    /// public zones. Library and hand are hidden zones.
    pub fn is_public(self) -> bool {
        !matches!(self, ZoneType::Library | ZoneType::Hand)
    }

    /// CR 400.1 — Each player has their own library, hand, and graveyard.
    /// The other zones are shared by all players.
    pub fn is_per_player(self) -> bool {
        matches!(
            self,
            ZoneType::Library | ZoneType::Hand | ZoneType::Graveyard
        )
    }
}

#[cfg(test)]
mod tests;
