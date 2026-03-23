use mtg_server_sdk::{error, input, output};

pub async fn ping(_input: input::PingInput) -> output::PingOutput {
    output::PingOutput {
        status: "ok".to_string(),
    }
}

pub async fn create_game(
    input: input::CreateGameInput,
) -> Result<output::CreateGameOutput, error::CreateGameError> {
    let game_id = uuid::Uuid::new_v4().to_string();
    let player_id = uuid::Uuid::new_v4().to_string();

    tracing::info!(
        %game_id,
        %player_id,
        format = ?input.format,
        player_name = %input.player_name,
        "game created"
    );

    Ok(output::CreateGameOutput {
        game_id,
        player_id,
    })
}

pub async fn join_game(
    input: input::JoinGameInput,
) -> Result<output::JoinGameOutput, error::JoinGameError> {
    let player_id = uuid::Uuid::new_v4().to_string();

    tracing::info!(
        game_id = %input.game_id,
        %player_id,
        player_name = %input.player_name,
        "player joined"
    );

    Ok(output::JoinGameOutput { player_id })
}

pub async fn get_game_state(
    input: input::GetGameStateInput,
) -> Result<output::GetGameStateOutput, error::GetGameStateError> {
    Ok(output::GetGameStateOutput {
        game_id: input.game_id,
        status: mtg_server_sdk::model::GameStatus::WaitingForPlayers,
        players: vec![],
        turn_number: 0,
        action_count: 0,
    })
}
