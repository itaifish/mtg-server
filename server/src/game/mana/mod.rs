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

impl From<Color> for ManaType {
    fn from(color: Color) -> Self {
        match color {
            Color::White => Self::White,
            Color::Blue => Self::Blue,
            Color::Black => Self::Black,
            Color::Red => Self::Red,
            Color::Green => Self::Green,
        }
    }
}

const ALL_MANA_TYPES: [ManaType; 6] = [
    ManaType::White,
    ManaType::Blue,
    ManaType::Black,
    ManaType::Red,
    ManaType::Green,
    ManaType::Colorless,
];

/// How a single mana symbol in a cost is being paid.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManaPayment {
    /// Which mana source is producing the mana (e.g., a land's ObjectId).
    pub source_id: ObjectId,
    /// What color/type of mana is being produced.
    pub mana_type: ManaType,
}

/// Describes mana produced by an ability.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ManaProduction {
    pub mana_type: ManaType,
    pub amount: u32,
    /// `None` means unrestricted.
    pub restriction: Option<ManaRestriction>,
}

impl ManaProduction {
    pub fn new(mana_type: ManaType, amount: u32) -> Self {
        Self {
            mana_type,
            amount,
            restriction: None,
        }
    }
}

/// CR 106.4b — Restrictions on how mana can be spent.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ManaRestriction {
    /// e.g., Ancient Ziggurat — "spend this mana only to cast creature spells"
    CreatureSpell,
    // TODO: add more as needed (e.g., ArtifactSpell, ActivatedAbility, etc.)
}

/// Restricted mana of a single type — an amount with a spending restriction.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RestrictedMana {
    pub amount: u32,
    pub restriction: ManaRestriction,
}

/// Mana of a single type in the pool — unrestricted plus any restricted amounts.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ManaPoolSlot {
    pub unrestricted: u32,
    pub restricted: Vec<RestrictedMana>,
}

/// CR 106.4 — A player's mana pool.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ManaPool {
    pub white: ManaPoolSlot,
    pub blue: ManaPoolSlot,
    pub black: ManaPoolSlot,
    pub red: ManaPoolSlot,
    pub green: ManaPoolSlot,
    pub colorless: ManaPoolSlot,
}

impl ManaPool {
    fn slot(&self, mana_type: ManaType) -> &ManaPoolSlot {
        match mana_type {
            ManaType::White => &self.white,
            ManaType::Blue => &self.blue,
            ManaType::Black => &self.black,
            ManaType::Red => &self.red,
            ManaType::Green => &self.green,
            ManaType::Colorless => &self.colorless,
        }
    }

    fn slot_mut(&mut self, mana_type: ManaType) -> &mut ManaPoolSlot {
        match mana_type {
            ManaType::White => &mut self.white,
            ManaType::Blue => &mut self.blue,
            ManaType::Black => &mut self.black,
            ManaType::Red => &mut self.red,
            ManaType::Green => &mut self.green,
            ManaType::Colorless => &mut self.colorless,
        }
    }

    /// Add unrestricted mana to the pool.
    /// TODO: replacement effects (e.g., Mana Reflection doubles mana)
    pub fn add(&mut self, mana_type: ManaType, amount: u32) {
        self.slot_mut(mana_type).unrestricted += amount;
    }

    /// Add restricted mana to the pool.
    pub fn add_restricted(
        &mut self,
        mana_type: ManaType,
        amount: u32,
        restriction: ManaRestriction,
    ) {
        let slot = self.slot_mut(mana_type);
        if let Some(entry) = slot
            .restricted
            .iter_mut()
            .find(|r| r.restriction == restriction)
        {
            entry.amount += amount;
        } else {
            slot.restricted.push(RestrictedMana {
                amount,
                restriction,
            });
        }
    }

    /// Try to spend unrestricted mana. Returns true if successful.
    /// Pool is unchanged on failure.
    pub fn spend(&mut self, mana_type: ManaType, amount: u32) -> bool {
        let slot = self.slot_mut(mana_type);
        if slot.unrestricted < amount {
            return false;
        }
        slot.unrestricted -= amount;
        true
    }

    /// Total unrestricted mana of a given type.
    pub fn available(&self, mana_type: ManaType) -> u32 {
        self.slot(mana_type).unrestricted
    }

    /// CR 106.4 — Empty the pool. Called on phase/step transitions.
    /// TODO: replacement effects (e.g., Omnath keeps green mana)
    pub fn clear(&mut self) {
        *self = Self::default();
    }

    pub fn is_empty(&self) -> bool {
        *self == Self::default()
    }

    /// Try to pay a mana cost using the provided payment plan.
    /// Each `SymbolPayment` maps a symbol in the cost to the mana types
    /// being used to pay for it. Returns true if successful.
    /// Pool is unchanged on failure.
    pub fn try_pay(
        &mut self,
        cost: &ManaCost,
        payments: &[SymbolPayment],
    ) -> Result<(), PaymentError> {
        if payments.len() != cost.symbols.len() {
            return Err(PaymentError::WrongPaymentCount);
        }

        // Validate each payment matches its symbol
        for (i, payment) in payments.iter().enumerate() {
            validate_payment(&cost.symbols[i], &payment.paid_with)?;
        }

        // Snapshot in case we need to roll back
        let snapshot = self.clone();

        // Spend all mana
        for payment in payments {
            for &mana_type in &payment.paid_with {
                if !self.spend(mana_type, 1) {
                    *self = snapshot;
                    return Err(PaymentError::InsufficientMana);
                }
            }
        }

        Ok(())
    }
}

/// How a single mana symbol in a cost is being paid.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SymbolPayment {
    /// What mana type(s) from the pool are paying for this symbol.
    /// Most symbols need exactly one; generic {N} needs N; monocolored
    /// hybrid {2/C} needs either 1 colored or 2 of any.
    pub paid_with: Vec<ManaType>,
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum PaymentError {
    #[error("wrong number of payments for cost symbols")]
    WrongPaymentCount,
    #[error("invalid payment for symbol: {0}")]
    InvalidPayment(String),
    #[error("not enough mana in pool")]
    InsufficientMana,
}

/// Validate that a payment is legal for a given mana symbol.
fn validate_payment(symbol: &ManaSymbol, paid_with: &[ManaType]) -> Result<(), PaymentError> {
    match symbol {
        ManaSymbol::Colored(color) => {
            let expected: ManaType = (*color).into();
            if paid_with != [expected] {
                return Err(PaymentError::InvalidPayment(format!(
                    "colored symbol requires exactly one {:?} mana",
                    color
                )));
            }
        }
        ManaSymbol::Generic(n) => {
            if paid_with.len() != *n as usize {
                return Err(PaymentError::InvalidPayment(format!(
                    "generic({}) requires exactly {} mana of any type",
                    n, n
                )));
            }
        }
        ManaSymbol::Colorless => {
            if paid_with != [ManaType::Colorless] {
                return Err(PaymentError::InvalidPayment(
                    "colorless symbol requires exactly one colorless mana".into(),
                ));
            }
        }
        ManaSymbol::Hybrid(a, b) => {
            let ma: ManaType = (*a).into();
            let mb: ManaType = (*b).into();
            if paid_with != [ma] && paid_with != [mb] {
                return Err(PaymentError::InvalidPayment(format!(
                    "hybrid symbol requires one {:?} or one {:?}",
                    a, b
                )));
            }
        }
        ManaSymbol::MonocoloredHybrid(color) => {
            let mc: ManaType = (*color).into();
            if paid_with == [mc] {
                // Paid with one colored — ok
            } else if paid_with.len() == 2 {
                // Paid with two of any — ok
            } else {
                return Err(PaymentError::InvalidPayment(format!(
                    "monocolored hybrid requires one {:?} or two of any",
                    color
                )));
            }
        }
        ManaSymbol::Phyrexian(_) => {
            // TODO: allow paying 2 life instead
            let color = match symbol {
                ManaSymbol::Phyrexian(c) => c,
                _ => unreachable!(),
            };
            let mc: ManaType = (*color).into();
            if paid_with != [mc] {
                return Err(PaymentError::InvalidPayment(
                    "phyrexian symbol requires one colored mana (life payment not yet supported)"
                        .into(),
                ));
            }
        }
        ManaSymbol::X => {
            // X can be paid with any amount of any mana
        }
        _ => {
            return Err(PaymentError::InvalidPayment(
                "unsupported mana symbol type".into(),
            ));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests;
