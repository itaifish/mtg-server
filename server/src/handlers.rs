use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use mtg_server_sdk::error::{
    CreateGameError, GameFullError, GetGameStateError, GetLegalActionsError, JoinGameError,
    NotFoundError, SubmitActionError,
};
use mtg_server_sdk::server::request::extension::Extension;
use mtg_server_sdk::{input, output};

use crate::engine;
use crate::game::phases_and_steps::{BeginningStep, Phase};
use crate::game::state::{GameState, GameStatus, Player, PlayerZones};
use crate::handler_helpers::{get_game, server_err};
use crate::store::GameStore;

// TODO: Add middleware to authenticate callers and associate them with their
// player ID, rather than trusting the caller-supplied player_id.

pub async fn ping(_input: input::PingInput) -> output::PingOutput {
    output::PingOutput {
        status: "ok".to_string(),
    }
}

pub async fn create_game(
    input: input::CreateGameInput,
    Extension(store): Extension<Arc<GameStore>>,
) -> Result<output::CreateGameOutput, CreateGameError> {
    let game_id = uuid::Uuid::new_v4().to_string();
    let player_id = uuid::Uuid::new_v4().to_string();

    let mut player_zones = HashMap::new();
    player_zones.insert(
        player_id.clone(),
        PlayerZones {
            library: vec![],
            hand: HashSet::new(),
            graveyard: vec![],
        },
    );

    let state = GameState {
        game_id: game_id.clone(),
        status: GameStatus::WaitingForPlayers,
        players: vec![Player::new(player_id.clone(), input.player_name.clone())],
        turn_order: vec![0],
        active_player_index: 0,
        turn_number: 0,
        phase: Phase::Beginning(BeginningStep::Untap),
        player_zones,
        battlefield: HashSet::new(),
        stack: vec![],
        exile: HashSet::new(),
        command: HashSet::new(),
        objects: HashMap::new(),
        next_object_id: 1,
        rng_seed: rand::random(),
        action_count: 0,
        lands_played_this_turn: 0,
    };

    store
        .create(state)
        .await
        .map_err(server_err::<CreateGameError>)?;

    tracing::info!(%game_id, %player_id, format = ?input.format, "game created");
    Ok(output::CreateGameOutput { game_id, player_id })
}

pub async fn join_game(
    input: input::JoinGameInput,
    Extension(store): Extension<Arc<GameStore>>,
) -> Result<output::JoinGameOutput, JoinGameError> {
    let mut state = get_game::<JoinGameError>(&store, &input.game_id).await?;

    if state.status != GameStatus::WaitingForPlayers {
        return Err(JoinGameError::GameFullError(GameFullError {
            message: "game is not accepting players".into(),
        }));
    }

    let player_id = uuid::Uuid::new_v4().to_string();

    state
        .players
        .push(Player::new(player_id.clone(), input.player_name.clone()));
    state.turn_order.push(state.players.len() - 1);
    state.player_zones.insert(
        player_id.clone(),
        PlayerZones {
            library: vec![],
            hand: HashSet::new(),
            graveyard: vec![],
        },
    );

    store
        .update(state)
        .await
        .map_err(server_err::<JoinGameError>)?;

    tracing::info!(game_id = %input.game_id, %player_id, "player joined");
    Ok(output::JoinGameOutput { player_id })
}

pub async fn get_game_state(
    input: input::GetGameStateInput,
    Extension(store): Extension<Arc<GameStore>>,
) -> Result<output::GetGameStateOutput, GetGameStateError> {
    let state = get_game::<GetGameStateError>(&store, &input.game_id).await?;

    Ok(output::GetGameStateOutput {
        game_id: state.game_id,
        status: state.status.into(),
        players: state.players.iter().map(Into::into).collect(),
        turn_number: state.turn_number as i32,
        action_count: state.action_count as i32,
    })
}

pub async fn submit_action(
    input: input::SubmitActionInput,
    Extension(store): Extension<Arc<GameStore>>,
) -> Result<output::SubmitActionOutput, SubmitActionError> {
    let mut state = get_game::<SubmitActionError>(&store, &input.game_id).await?;

    match &input.action {
        mtg_server_sdk::model::ActionInput::PassPriority(_) => {
            engine::actions::pass_priority(&mut state, &input.player_id)?;
        }
        mtg_server_sdk::model::ActionInput::PlayLand(play) => {
            engine::actions::play_land(&mut state, &input.player_id, play.object_id as u64)?;
        }
        mtg_server_sdk::model::ActionInput::Concede(_) => {
            engine::actions::concede(&mut state, &input.player_id)?;
        }
        _ => {
            return Err(engine::actions::ActionError::Illegal("unsupported action".into()).into());
        }
    };

    store
        .update(state.clone())
        .await
        .map_err(server_err::<SubmitActionError>)?;

    Ok(output::SubmitActionOutput {
        game_id: state.game_id,
        action_count: state.action_count as i32,
        status: state.status.into(),
    })
}

pub async fn get_legal_actions(
    input: input::GetLegalActionsInput,
    Extension(store): Extension<Arc<GameStore>>,
) -> Result<output::GetLegalActionsOutput, GetLegalActionsError> {
    let state = get_game::<GetLegalActionsError>(&store, &input.game_id).await?;

    if !state.has_player(&input.player_id) {
        return Err(GetLegalActionsError::NotFoundError(NotFoundError {
            message: format!("player {} not found", input.player_id),
        }));
    }

    let actions = engine::legal_actions::for_player(&state, &input.player_id)
        .into_iter()
        .map(Into::into)
        .collect();

    Ok(output::GetLegalActionsOutput {
        game_id: state.game_id,
        actions,
    })
}
