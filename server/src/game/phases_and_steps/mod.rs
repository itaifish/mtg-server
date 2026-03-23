use serde::{Deserialize, Serialize};

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

impl Phase {
    /// Returns the next phase/step in turn order.
    /// CR 500.1 — After cleanup, returns `None` to indicate the turn is over.
    pub fn next(self) -> Option<Phase> {
        match self {
            Phase::Beginning(BeginningStep::Untap) => Some(Phase::Beginning(BeginningStep::Upkeep)),
            Phase::Beginning(BeginningStep::Upkeep) => Some(Phase::Beginning(BeginningStep::Draw)),
            Phase::Beginning(BeginningStep::Draw) => Some(Phase::PrecombatMain),
            Phase::PrecombatMain => Some(Phase::Combat(CombatStep::BeginningOfCombat)),
            Phase::Combat(CombatStep::BeginningOfCombat) => {
                Some(Phase::Combat(CombatStep::DeclareAttackers))
            }
            Phase::Combat(CombatStep::DeclareAttackers) => {
                Some(Phase::Combat(CombatStep::DeclareBlockers))
            }
            Phase::Combat(CombatStep::DeclareBlockers) => {
                Some(Phase::Combat(CombatStep::CombatDamage))
            }
            Phase::Combat(CombatStep::CombatDamage) => Some(Phase::Combat(CombatStep::EndOfCombat)),
            Phase::Combat(CombatStep::EndOfCombat) => Some(Phase::PostcombatMain),
            Phase::PostcombatMain => Some(Phase::Ending(EndingStep::End)),
            Phase::Ending(EndingStep::End) => Some(Phase::Ending(EndingStep::Cleanup)),
            Phase::Ending(EndingStep::Cleanup) => None,
        }
    }
}

#[cfg(test)]
mod tests;
