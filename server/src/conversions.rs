use crate::game::state::GameStatus;

impl From<GameStatus> for mtg_server_sdk::model::GameStatus {
    fn from(status: GameStatus) -> Self {
        match status {
            GameStatus::WaitingForPlayers => Self::WaitingForPlayers,
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
