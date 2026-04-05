use serde::{Deserialize, Serialize};

/// CR 702 — Keyword abilities. Keywords that can have multiple instances
/// (e.g., protection, landwalk) include a parameter.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Keyword {
    // --- Evergreen keywords ---
    Deathtouch,
    Defender,
    DoubleStrike,
    FirstStrike,
    Flash,
    Flying,
    Haste,
    Hexproof,
    Indestructible,
    Lifelink,
    Menace,
    Reach,
    Trample,
    Vigilance,

    // --- Keywords with parameters ---
    /// CR 702.16 — Protection from a quality (e.g., "protection from red").
    Protection(String),
    /// CR 702.14 — Landwalk (e.g., "forestwalk").
    Landwalk(String),
    /// CR 702.20 — Ward (pay a cost or counter the spell/ability).
    Ward(u32),
    // TODO: add more as needed
}
