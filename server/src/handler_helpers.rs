use mtg_server_sdk::error::{
    CreateGameError, GetGameStateError, GetLegalActionsError, JoinGameError, NotFoundError,
    ServerError, SetReadyError, SubmitActionError,
};

use crate::game::state::GameState;
use crate::store::GameStore;

pub struct NotFound(pub String);
pub struct ServerErr;

/// Generic game lookup that converts to any error type with NotFoundError and ServerError variants.
pub async fn get_game<E>(store: &GameStore, game_id: &str) -> Result<GameState, E>
where
    E: From<NotFound> + From<ServerErr>,
{
    store
        .get(game_id)
        .await
        .map_err(|e| {
            tracing::error!(%e, "db error");
            E::from(ServerErr)
        })?
        .ok_or_else(|| E::from(NotFound(game_id.to_string())))
}

pub fn server_err<E: From<ServerErr>>(e: anyhow::Error) -> E {
    tracing::error!(%e, "store error");
    E::from(ServerErr)
}

macro_rules! impl_lookup_errors {
    ($err:ty, $not_found:ident, $server:ident) => {
        impl From<$crate::handler_helpers::NotFound> for $err {
            fn from(e: $crate::handler_helpers::NotFound) -> Self {
                Self::$not_found(NotFoundError {
                    message: format!("game {} not found", e.0),
                })
            }
        }
        impl From<$crate::handler_helpers::ServerErr> for $err {
            fn from(_: $crate::handler_helpers::ServerErr) -> Self {
                Self::$server(ServerError {
                    message: "internal error".into(),
                })
            }
        }
    };
}

impl_lookup_errors!(JoinGameError, NotFoundError, ServerError);
impl_lookup_errors!(GetGameStateError, NotFoundError, ServerError);
impl_lookup_errors!(SubmitActionError, NotFoundError, ServerError);
impl_lookup_errors!(GetLegalActionsError, NotFoundError, ServerError);
impl_lookup_errors!(SetReadyError, NotFoundError, ServerError);

// CreateGameError has no NotFoundError variant, only needs ServerErr
impl From<ServerErr> for CreateGameError {
    fn from(_: ServerErr) -> Self {
        Self::ServerError(ServerError {
            message: "internal error".into(),
        })
    }
}
