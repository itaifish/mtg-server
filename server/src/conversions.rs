use crate::game::state::GameStatus;

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
        }
    }
}

impl From<crate::engine::legal_actions::LegalAction> for mtg_server_sdk::model::LegalAction {
    fn from(a: crate::engine::legal_actions::LegalAction) -> Self {
        match a {
            crate::engine::legal_actions::LegalAction::PassPriority => Self {
                action_type: mtg_server_sdk::model::LegalActionType::PassPriority,
                object_id: None,
            },
            crate::engine::legal_actions::LegalAction::PlayLand { object_id } => Self {
                action_type: mtg_server_sdk::model::LegalActionType::PlayLand,
                object_id: Some(object_id as i64),
            },
            crate::engine::legal_actions::LegalAction::Concede => Self {
                action_type: mtg_server_sdk::model::LegalActionType::Concede,
                object_id: None,
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
            mtg_server_sdk::model::SpellTarget::Player(p) => {
                Self::Player(p.player_id.clone())
            }
            mtg_server_sdk::model::SpellTarget::Object(o) => {
                Self::Object(o.object_id as u64)
            }
            _ => Self::Player("unknown".into()),
        }
    }
}
