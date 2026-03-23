use serde::{Deserialize, Serialize};

use super::card::ObjectId;

/// CR 105 — There are five colors in the Magic game: white, blue, black, red,
/// and green.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Color {
    White,
    Blue,
    Black,
    Red,
    Green,
}

/// CR 107.4 — Individual mana symbols that can appear in a mana cost.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ManaSymbol {
    /// CR 107.4a — {W}, {U}, {B}, {R}, {G}
    Colored(Color),
    /// CR 107.4b — {1}, {2}, etc. Generic mana, payable with any type.
    Generic(u32),
    /// CR 107.4c — {C} Colorless mana, payable only with colorless mana.
    Colorless,
    /// CR 107.4e — {W/U}, {B/R}, etc. Payable with either color.
    Hybrid(Color, Color),
    /// CR 107.4e — {2/W}, {2/B}, etc. Payable with one colored or two of any.
    MonocoloredHybrid(Color),
    /// CR 107.4e — {C/W}, {C/R}, etc. Payable with colorless or one colored.
    ColorlessHybrid(Color),
    /// CR 107.4f — {W/P}, {U/P}, etc. Payable with one colored mana or 2 life.
    Phyrexian(Color),
    /// CR 107.4f — {W/U/P}, {B/R/P}, etc. Payable with either color or 2 life.
    HybridPhyrexian(Color, Color),
    /// CR 107.4h — {S} Snow mana, payable with mana from a snow source.
    Snow,
    /// CR 107.3 — {X} Variable mana.
    X,
}

/// A full mana cost is an ordered sequence of mana symbols.
/// CR 202.1 — A card's mana cost is indicated by mana symbols near the top of
/// the card.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ManaCost {
    pub symbols: Vec<ManaSymbol>,
}

impl ManaCost {
    /// CR 202.3 — The mana value of an object is a number equal to the total
    /// amount of mana in its mana cost, regardless of color.
    pub fn mana_value(&self) -> u32 {
        self.symbols
            .iter()
            .map(|s| match s {
                ManaSymbol::Colored(_) => 1,
                ManaSymbol::Generic(n) => *n,
                ManaSymbol::Colorless => 1,
                ManaSymbol::Hybrid(_, _) => 1,
                // CR 202.3e — Monocolored hybrid counts as the larger component
                ManaSymbol::MonocoloredHybrid(_) => 2,
                ManaSymbol::ColorlessHybrid(_) => 1,
                ManaSymbol::Phyrexian(_) => 1,
                ManaSymbol::HybridPhyrexian(_, _) => 1,
                ManaSymbol::Snow => 1,
                // CR 107.3g — X in mana cost is 0 when not on the stack
                ManaSymbol::X => 0,
            })
            .sum()
    }
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

/// How a single mana symbol in a cost is being paid.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManaPayment {
    /// Which mana source is producing the mana (e.g., a land's ObjectId).
    pub source_id: ObjectId,
    /// What color/type of mana is being produced.
    pub mana_type: ManaType,
}

#[cfg(test)]
mod tests;
