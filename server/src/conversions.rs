use crate::game::state::{ChoiceKind, GameStatus, PendingChoice};

impl From<&PendingChoice> for mtg_server_sdk::model::PendingChoiceInfo {
    fn from(c: &PendingChoice) -> Self {
        use mtg_server_sdk::model::ChoiceType;
        Self {
            player_id: c.player_id.clone(),
            prompt: c.prompt.clone(),
            choice_type: match &c.kind {
                ChoiceKind::YesNo { .. } => ChoiceType::YesNo,
                ChoiceKind::PickOne { .. } => ChoiceType::PickOne,
                ChoiceKind::ChooseObjects { .. } => ChoiceType::ChooseObjects,
            },
        }
    }
}

impl From<GameStatus> for mtg_server_sdk::model::GameStatus {
    fn from(status: GameStatus) -> Self {
        match status {
            GameStatus::WaitingForPlayers => Self::WaitingForPlayers,
            GameStatus::ChoosingPlayOrder => Self::ChoosingPlayOrder,
            GameStatus::ResolvingMulligans => Self::Mulligan,
            GameStatus::InProgress => Self::InProgress,
            GameStatus::Finished => Self::Finished,
        }
    }
}

impl From<&crate::game::state::Player> for mtg_server_sdk::model::PlayerInfo {
    fn from(p: &crate::game::state::Player) -> Self {
        Self {
            player_id: p.id.clone(),
            name: p.name.clone(),
            life_total: p.life_total,
            ready: p.pregame.ready,
            hand_size: 0,
            library_size: 0,
            poison_counters: p.poison_counters as i32,
            mulligan_count: p.pregame.mulligan_count as i32,
            has_kept: p.pregame.has_kept,
            energy: p.energy as i32,
            mana_pool: (&p.mana_pool).into(),
        }
    }
}

/// PlayerInfo with zone sizes requires GameState access.
pub fn player_info(
    p: &crate::game::state::Player,
    state: &crate::game::state::GameState,
) -> mtg_server_sdk::model::PlayerInfo {
    let zones = state.player_zones.get(&p.id);
    mtg_server_sdk::model::PlayerInfo {
        player_id: p.id.clone(),
        name: p.name.clone(),
        life_total: p.life_total,
        ready: p.pregame.ready,
        hand_size: zones.map(|z| z.hand.len() as i32).unwrap_or(0),
        library_size: zones.map(|z| z.library.len() as i32).unwrap_or(0),
        poison_counters: p.poison_counters as i32,
        mulligan_count: p.pregame.mulligan_count as i32,
        has_kept: p.pregame.has_kept,
        energy: p.energy as i32,
        mana_pool: (&p.mana_pool).into(),
    }
}

impl From<crate::engine::legal_actions::LegalAction> for mtg_server_sdk::model::LegalAction {
    fn from(a: crate::engine::legal_actions::LegalAction) -> Self {
        use crate::engine::legal_actions::LegalAction as LA;
        use mtg_server_sdk::model::LegalActionType as T;
        match a {
            LA::PassPriority => Self {
                action_type: T::PassPriority,
                object_id: None,
                target_requirements: None,
                mana_cost: None,
            },
            LA::PlayLand { object_id } => Self {
                action_type: T::PlayLand,
                object_id: Some(object_id as i64),
                target_requirements: None,
                mana_cost: None,
            },
            LA::CastSpell {
                object_id,
                target_requirements,
                mana_cost_symbols,
            } => Self {
                action_type: T::CastSpell,
                object_id: Some(object_id as i64),
                target_requirements: Some(
                    target_requirements
                        .into_iter()
                        .map(|kinds| mtg_server_sdk::model::TargetRequirement {
                            valid_kinds: kinds.into_iter().map(Into::into).collect(),
                        })
                        .collect(),
                ),
                mana_cost: Some(mana_cost_symbols),
            },
            LA::ActivateManaAbility { object_id, .. } => Self {
                action_type: T::ActivateManaAbility,
                object_id: Some(object_id as i64),
                target_requirements: None,
                mana_cost: None,
            },
            LA::DeclareAttackers => Self {
                action_type: T::DeclareAttackers,
                object_id: None,
                target_requirements: None,
                mana_cost: None,
            },
            LA::DeclareBlockers => Self {
                action_type: T::DeclareBlockers,
                object_id: None,
                target_requirements: None,
                mana_cost: None,
            },
            LA::Concede => Self {
                action_type: T::Concede,
                object_id: None,
                target_requirements: None,
                mana_cost: None,
            },
        }
    }
}

impl From<crate::engine::actions::ActionError> for mtg_server_sdk::error::SubmitActionError {
    fn from(e: crate::engine::actions::ActionError) -> Self {
        match e {
            crate::engine::actions::ActionError::PlayerNotFound(msg) => {
                Self::NotFoundError(mtg_server_sdk::error::NotFoundError { message: msg })
            }
            crate::engine::actions::ActionError::Illegal(msg) => {
                Self::IllegalActionError(mtg_server_sdk::error::IllegalActionError { message: msg })
            }
        }
    }
}

impl From<&mtg_server_sdk::model::DecklistEntry> for crate::deck::loader::DeckEntry {
    fn from(e: &mtg_server_sdk::model::DecklistEntry) -> Self {
        Self {
            card_name: e.card_name.clone(),
            count: e.count as u32,
        }
    }
}

impl From<&mtg_server_sdk::model::ManaTypeEnum> for crate::game::mana::ManaType {
    fn from(m: &mtg_server_sdk::model::ManaTypeEnum) -> Self {
        match m {
            mtg_server_sdk::model::ManaTypeEnum::White => Self::White,
            mtg_server_sdk::model::ManaTypeEnum::Blue => Self::Blue,
            mtg_server_sdk::model::ManaTypeEnum::Black => Self::Black,
            mtg_server_sdk::model::ManaTypeEnum::Red => Self::Red,
            mtg_server_sdk::model::ManaTypeEnum::Green => Self::Green,
            mtg_server_sdk::model::ManaTypeEnum::Colorless => Self::Colorless,
            _ => Self::Colorless,
        }
    }
}

impl From<&mtg_server_sdk::model::SymbolPaymentEntry> for crate::game::mana::SymbolPayment {
    fn from(e: &mtg_server_sdk::model::SymbolPaymentEntry) -> Self {
        Self {
            paid_with: e.paid_with.iter().map(Into::into).collect(),
        }
    }
}

impl From<&mtg_server_sdk::model::AttackerEntry> for crate::game::state::AttackerInfo {
    fn from(e: &mtg_server_sdk::model::AttackerEntry) -> Self {
        Self {
            object_id: e.object_id as u64,
            target: crate::game::state::AttackTarget::Player(e.target_player_id.clone()),
        }
    }
}

impl From<&mtg_server_sdk::model::BlockerEntry> for crate::game::state::BlockerInfo {
    fn from(e: &mtg_server_sdk::model::BlockerEntry) -> Self {
        Self {
            object_id: e.object_id as u64,
            blocking: e.blocking_id as u64,
        }
    }
}

impl From<&mtg_server_sdk::model::SpellTarget> for crate::game::stack::SpellTarget {
    fn from(t: &mtg_server_sdk::model::SpellTarget) -> Self {
        match t {
            mtg_server_sdk::model::SpellTarget::Player(p) => Self::Player(p.player_id.clone()),
            mtg_server_sdk::model::SpellTarget::Object(o) => Self::Object(o.object_id as u64),
            _ => Self::Player("unknown".into()),
        }
    }
}

impl TryFrom<&crate::game::card::CardInstance> for mtg_server_sdk::model::PermanentInfo {
    type Error = &'static str;

    fn try_from(card: &crate::game::card::CardInstance) -> Result<Self, Self::Error> {
        if !card.definition.card_types.iter().any(|t| t.is_permanent()) {
            return Err("not a permanent");
        }
        Ok(Self {
            object_id: card.id as i64,
            name: card.definition.name.clone(),
            oracle_id: card.definition.oracle_id.clone(),
            controller: card.controller.clone().unwrap_or_default(),
            owner: card.owner.clone(),
            card_types: card
                .definition
                .card_types
                .iter()
                .map(|t| format!("{:?}", t))
                .collect(),
            subtypes: card.definition.subtypes.clone(),
            power: card.definition.power,
            toughness: card.definition.toughness,
            effective_power: card.effective_power(),
            effective_toughness: card.effective_toughness(),
            tapped: card.tapped,
            summoning_sick: card.is_summoning_sick(),
            damage_marked: card.damage_marked as i32,
            counters: card
                .counters
                .iter()
                .map(|c| mtg_server_sdk::model::CounterInfo {
                    counter_type: format!("{:?}", c.counter_type),
                    count: c.count as i32,
                })
                .collect(),
            keywords: card.keywords.keys().map(|k| format!("{:?}", k)).collect(),
        })
    }
}

impl From<mtg_server_sdk::model::GameStatus> for crate::game::state::GameStatus {
    fn from(status: mtg_server_sdk::model::GameStatus) -> Self {
        match status {
            mtg_server_sdk::model::GameStatus::WaitingForPlayers => Self::WaitingForPlayers,
            mtg_server_sdk::model::GameStatus::ChoosingPlayOrder => Self::ChoosingPlayOrder,
            mtg_server_sdk::model::GameStatus::Mulligan => Self::ResolvingMulligans,
            mtg_server_sdk::model::GameStatus::InProgress => Self::InProgress,
            mtg_server_sdk::model::GameStatus::Finished => Self::Finished,
            _ => Self::WaitingForPlayers,
        }
    }
}

impl From<crate::store::GameListItem> for mtg_server_sdk::model::GameSummary {
    fn from(g: crate::store::GameListItem) -> Self {
        Self {
            game_id: g.game_id,
            name: g.name,
            status: match g.status.as_str() {
                "WaitingForPlayers" => mtg_server_sdk::model::GameStatus::WaitingForPlayers,
                "ChoosingPlayOrder" => mtg_server_sdk::model::GameStatus::ChoosingPlayOrder,
                "ResolvingMulligans" => mtg_server_sdk::model::GameStatus::Mulligan,
                "InProgress" => mtg_server_sdk::model::GameStatus::InProgress,
                "Finished" => mtg_server_sdk::model::GameStatus::Finished,
                _ => mtg_server_sdk::model::GameStatus::WaitingForPlayers,
            },
            player_count: g.player_count,
            format: mtg_server_sdk::model::GameFormat::Standard,
        }
    }
}

impl From<crate::game::phases_and_steps::Phase> for mtg_server_sdk::model::GamePhase {
    fn from(phase: crate::game::phases_and_steps::Phase) -> Self {
        use crate::game::phases_and_steps::{BeginningStep, CombatStep, EndingStep, Phase};
        match phase {
            Phase::Beginning(BeginningStep::Untap) => Self::Untap,
            Phase::Beginning(BeginningStep::Upkeep) => Self::Upkeep,
            Phase::Beginning(BeginningStep::Draw) => Self::Draw,
            Phase::PrecombatMain => Self::PrecombatMain,
            Phase::Combat(CombatStep::BeginningOfCombat) => Self::BeginningOfCombat,
            Phase::Combat(CombatStep::DeclareAttackers) => Self::DeclareAttackers,
            Phase::Combat(CombatStep::DeclareBlockers) => Self::DeclareBlockers,
            Phase::Combat(CombatStep::CombatDamage) => Self::CombatDamage,
            Phase::Combat(CombatStep::EndOfCombat) => Self::EndOfCombat,
            Phase::PostcombatMain => Self::PostcombatMain,
            Phase::Ending(EndingStep::End) => Self::EndStep,
            Phase::Ending(EndingStep::Cleanup) => Self::Cleanup,
        }
    }
}

impl From<&crate::game::state::CombatState> for mtg_server_sdk::model::CombatInfo {
    fn from(c: &crate::game::state::CombatState) -> Self {
        Self {
            attackers: c.attackers.iter().map(Into::into).collect(),
            blockers: c.blockers.iter().map(Into::into).collect(),
        }
    }
}

impl From<&crate::game::state::AttackerInfo> for mtg_server_sdk::model::CombatAttackerInfo {
    fn from(a: &crate::game::state::AttackerInfo) -> Self {
        Self {
            object_id: a.object_id as i64,
            target_player_id: match &a.target {
                crate::game::state::AttackTarget::Player(pid) => pid.clone(),
                _ => String::new(),
            },
        }
    }
}

impl From<&crate::game::state::BlockerInfo> for mtg_server_sdk::model::CombatBlockerInfo {
    fn from(b: &crate::game::state::BlockerInfo) -> Self {
        Self {
            object_id: b.object_id as i64,
            blocking_id: b.blocking as i64,
        }
    }
}

impl From<&crate::game::card::CardInstance> for mtg_server_sdk::model::CardInfo {
    fn from(card: &crate::game::card::CardInstance) -> Self {
        Self {
            object_id: card.id as i64,
            name: card.definition.name.clone(),
            oracle_id: card.definition.oracle_id.clone(),
            card_types: card
                .definition
                .card_types
                .iter()
                .map(|t| format!("{:?}", t))
                .collect(),
            mana_cost: card
                .definition
                .mana_cost
                .as_ref()
                .map(|mc| mc.symbols.iter().map(|s| format!("{:?}", s)).collect()),
            mana_value: card
                .definition
                .mana_cost
                .as_ref()
                .map(|mc| mc.mana_value() as i32)
                .unwrap_or(0),
        }
    }
}

fn mana_slot_info(
    slot: &crate::game::mana::ManaPoolSlot,
) -> mtg_server_sdk::model::ManaPoolSlotInfo {
    mtg_server_sdk::model::ManaPoolSlotInfo {
        unrestricted: slot.unrestricted as i32,
        restricted: slot
            .restricted
            .iter()
            .map(|r| mtg_server_sdk::model::RestrictedManaInfo {
                amount: r.amount as i32,
                restriction: format!("{:?}", r.restriction),
            })
            .collect(),
    }
}

impl From<&crate::game::mana::ManaPool> for mtg_server_sdk::model::ManaPoolInfo {
    fn from(pool: &crate::game::mana::ManaPool) -> Self {
        Self {
            white: mana_slot_info(&pool.white),
            blue: mana_slot_info(&pool.blue),
            black: mana_slot_info(&pool.black),
            red: mana_slot_info(&pool.red),
            green: mana_slot_info(&pool.green),
            colorless: mana_slot_info(&pool.colorless),
        }
    }
}

impl From<&crate::game::stack::SpellTarget> for mtg_server_sdk::model::SpellTarget {
    fn from(t: &crate::game::stack::SpellTarget) -> Self {
        match t {
            crate::game::stack::SpellTarget::Player(pid) => {
                Self::Player(mtg_server_sdk::model::PlayerTarget {
                    player_id: pid.clone(),
                })
            }
            crate::game::stack::SpellTarget::Object(oid) => {
                Self::Object(mtg_server_sdk::model::ObjectTarget {
                    object_id: *oid as i64,
                })
            }
        }
    }
}

impl From<crate::game::effect::TargetKind> for mtg_server_sdk::model::TargetKind {
    fn from(k: crate::game::effect::TargetKind) -> Self {
        use crate::game::effect::TargetKind as TK;
        match k {
            TK::Player => Self::Player,
            TK::Creature => Self::Creature,
            TK::Planeswalker => Self::Planeswalker,
            TK::Artifact => Self::Artifact,
            TK::Enchantment => Self::Enchantment,
            TK::Land => Self::Land,
            TK::Permanent => Self::Permanent,
            TK::Spell => Self::Spell,
        }
    }
}

impl From<mtg_server_sdk::model::GamePhase> for crate::game::phases_and_steps::Phase {
    fn from(phase: mtg_server_sdk::model::GamePhase) -> Self {
        use crate::game::phases_and_steps::{BeginningStep, CombatStep, EndingStep};
        match phase {
            mtg_server_sdk::model::GamePhase::Untap => Self::Beginning(BeginningStep::Untap),
            mtg_server_sdk::model::GamePhase::Upkeep => Self::Beginning(BeginningStep::Upkeep),
            mtg_server_sdk::model::GamePhase::Draw => Self::Beginning(BeginningStep::Draw),
            mtg_server_sdk::model::GamePhase::PrecombatMain => Self::PrecombatMain,
            mtg_server_sdk::model::GamePhase::BeginningOfCombat => {
                Self::Combat(CombatStep::BeginningOfCombat)
            }
            mtg_server_sdk::model::GamePhase::DeclareAttackers => {
                Self::Combat(CombatStep::DeclareAttackers)
            }
            mtg_server_sdk::model::GamePhase::DeclareBlockers => {
                Self::Combat(CombatStep::DeclareBlockers)
            }
            mtg_server_sdk::model::GamePhase::CombatDamage => {
                Self::Combat(CombatStep::CombatDamage)
            }
            mtg_server_sdk::model::GamePhase::EndOfCombat => Self::Combat(CombatStep::EndOfCombat),
            mtg_server_sdk::model::GamePhase::PostcombatMain => Self::PostcombatMain,
            mtg_server_sdk::model::GamePhase::EndStep => Self::Ending(EndingStep::End),
            mtg_server_sdk::model::GamePhase::Cleanup => Self::Ending(EndingStep::Cleanup),
            _ => Self::PrecombatMain,
        }
    }
}

pub fn auto_pass_mode_from(
    action: &mtg_server_sdk::model::SetAutoPassAction,
    current_turn: u32,
) -> crate::game::state::AutoPassMode {
    use crate::game::state::AutoPassMode;
    match action.mode {
        mtg_server_sdk::model::AutoPassModeEnum::None => AutoPassMode::None,
        mtg_server_sdk::model::AutoPassModeEnum::UntilStackOrTurn => {
            AutoPassMode::UntilStackOrTurn {
                set_on_turn: current_turn,
            }
        }
        mtg_server_sdk::model::AutoPassModeEnum::UntilPhase => {
            let phase = action
                .stop_at_phase
                .clone()
                .map(Into::into)
                .unwrap_or(crate::game::phases_and_steps::Phase::PrecombatMain);
            AutoPassMode::UntilPhase(phase)
        }
        _ => AutoPassMode::None,
    }
}
