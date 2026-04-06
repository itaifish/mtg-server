use std::collections::HashSet;
use std::sync::Arc;

use mtg_server_sdk::error::{
    CreateGameError, GameFullError, GetGameStateError, GetLegalActionsError, JoinGameError,
    LeaveGameError, ListGamesError, NotFoundError, SetReadyError, SubmitActionError,
};
use mtg_server_sdk::server::request::extension::Extension;
use mtg_server_sdk::{input, output};

use mtg_server_sdk::model::{
    ActionInput, CardInfo, CombatAttackerInfo, CombatBlockerInfo, CombatInfo, PermanentInfo,
    PlayerZoneEntry, StackEntryInfo,
};

use crate::deck::loader::{load_deck, DeckEntry};
use crate::engine;
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

    let mut state = GameState::new(
        game_id.clone(),
        input.game_name.clone(),
        vec![Player::new(player_id.clone(), input.player_name.clone())],
        rand::random(),
    );

    let entries: Vec<DeckEntry> = input.decklist.iter().map(Into::into).collect();

    load_deck(&mut state, &player_id, &entries).map_err(|e| {
        tracing::error!(%e, "invalid decklist");
        CreateGameError::ServerError(mtg_server_sdk::error::ServerError { message: e })
    })?;

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
    state.starting_turn_order.push(player_id.clone());
    state.living_turn_order.push(player_id.clone());
    state.player_zones.insert(
        player_id.clone(),
        PlayerZones {
            library: vec![],
            hand: HashSet::new(),
            graveyard: vec![],
        },
    );

    let entries: Vec<DeckEntry> = input.decklist.iter().map(Into::into).collect();

    load_deck(&mut state, &player_id, &entries).map_err(|e| {
        tracing::error!(%e, "invalid decklist");
        JoinGameError::ServerError(mtg_server_sdk::error::ServerError { message: e })
    })?;

    store
        .update(state)
        .await
        .map_err(server_err::<JoinGameError>)?;

    tracing::info!(game_id = %input.game_id, %player_id, "player joined");
    Ok(output::JoinGameOutput { player_id })
}

pub async fn leave_game(
    input: input::LeaveGameInput,
    Extension(store): Extension<Arc<GameStore>>,
) -> Result<output::LeaveGameOutput, LeaveGameError> {
    let mut state = get_game::<LeaveGameError>(&store, &input.game_id).await?;

    if state.status != GameStatus::WaitingForPlayers {
        return Err(LeaveGameError::ServerError(
            mtg_server_sdk::error::ServerError {
                message: "can only leave during lobby phase".into(),
            },
        ));
    }

    state.players.retain(|p| p.id != input.player_id);
    state.living_turn_order.retain(|id| id != &input.player_id);
    state
        .starting_turn_order
        .retain(|id| id != &input.player_id);
    state.player_zones.remove(&input.player_id);

    let remaining = state.players.len() as i32;

    if remaining == 0 {
        store
            .delete(&input.game_id)
            .await
            .map_err(server_err::<LeaveGameError>)?;
    } else {
        store
            .update(state)
            .await
            .map_err(server_err::<LeaveGameError>)?;
    }

    tracing::info!(game_id = %input.game_id, player_id = %input.player_id, "player left");
    Ok(output::LeaveGameOutput {
        game_id: input.game_id,
        players_remaining: remaining,
    })
}

pub async fn list_games(
    input: input::ListGamesInput,
    Extension(store): Extension<Arc<GameStore>>,
) -> Result<output::ListGamesOutput, ListGamesError> {
    let status_filter: Option<GameStatus> = input.status.map(Into::into);
    let limit = input.limit.unwrap_or(20) as i64;
    let offset = input.offset.unwrap_or(0) as i64;
    let search = input.search.as_deref();

    let items = store
        .list(status_filter, search, limit, offset)
        .await
        .map_err(server_err::<ListGamesError>)?;

    Ok(output::ListGamesOutput {
        games: items.into_iter().map(Into::into).collect(),
    })
}

pub async fn set_ready(
    input: input::SetReadyInput,
    Extension(store): Extension<Arc<GameStore>>,
) -> Result<output::SetReadyOutput, SetReadyError> {
    let mut state = get_game::<SetReadyError>(&store, &input.game_id).await?;

    if state.status != GameStatus::WaitingForPlayers {
        return Err(SetReadyError::ServerError(
            mtg_server_sdk::error::ServerError {
                message: "game is not in lobby phase".into(),
            },
        ));
    }

    let player = state.get_player_mut(&input.player_id).ok_or_else(|| {
        SetReadyError::NotFoundError(NotFoundError {
            message: format!("player {} not found", input.player_id),
        })
    })?;
    player.pregame.ready = input.ready;

    let all_ready = state.players.len() >= 2 && state.players.iter().all(|p| p.pregame.ready);

    if all_ready {
        // CR 103.1 — Randomly choose who gets to pick the starting player
        use rand::Rng;
        let chooser_idx = state.rng.gen_range(0..state.players.len());
        let chooser_id = state.players[chooser_idx].id.clone();
        state.play_order_chooser = Some(chooser_id);
        state.status = GameStatus::ChoosingPlayOrder;
    }

    let status = state.status;
    store
        .update(state)
        .await
        .map_err(server_err::<SetReadyError>)?;

    Ok(output::SetReadyOutput {
        game_id: input.game_id,
        all_ready,
        status: status.into(),
    })
}

pub async fn get_card_image(
    input: input::GetCardImageInput,
) -> Result<output::GetCardImageOutput, mtg_server_sdk::error::GetCardImageError> {
    let version = input.version.as_deref().unwrap_or("normal");
    // Scryfall image API uses card name, not oracle_id
    // First look up the card name from our registry, fall back to oracle_id search
    let image_url = if let Some(card) = crate::cards::card_by_oracle_id(&input.oracle_id) {
        format!(
            "https://api.scryfall.com/cards/named?exact={}&format=image&version={}",
            urlencoding::encode(&card.name),
            version,
        )
    } else {
        format!(
            "https://api.scryfall.com/cards/named?exact={}&format=image&version={}",
            urlencoding::encode(&input.oracle_id),
            version,
        )
    };
    Ok(output::GetCardImageOutput { image_url })
}

pub async fn get_game_state(
    input: input::GetGameStateInput,
    Extension(store): Extension<Arc<GameStore>>,
) -> Result<output::GetGameStateOutput, GetGameStateError> {
    let state = get_game::<GetGameStateError>(&store, &input.game_id).await?;

    Ok(output::GetGameStateOutput {
        game_id: state.game_id.clone(),
        status: state.status.into(),
        players: state
            .players
            .iter()
            .map(|p| crate::conversions::player_info(p, &state))
            .collect(),
        turn_number: state.turn_number as i32,
        action_count: state.action_count as i32,
        phase: state.phase.into(),
        lands_played_this_turn: state.lands_played_this_turn as i32,
        combat: state.combat.as_ref().map(Into::into),
        priority_player_id: if state.status == GameStatus::InProgress {
            Some(state.priority_player().id.clone())
        } else {
            None
        },
        active_player_id: if state.status == GameStatus::InProgress {
            Some(state.active_player().id.clone())
        } else {
            None
        },
        play_order_chooser_id: state.play_order_chooser.clone(),
        battlefield: Some(
            state
                .battlefield
                .iter()
                .filter_map(|id| PermanentInfo::try_from(state.objects.get(id)?).ok())
                .collect(),
        ),
        hand: input.perspective_player_id.as_ref().and_then(|pid| {
            state.player_zones.get(pid).map(|zones| {
                zones
                    .hand
                    .iter()
                    .filter_map(|id| state.objects.get(id).map(CardInfo::from))
                    .collect()
            })
        }),
        graveyards: Some(
            state
                .player_zones
                .iter()
                .map(|(pid, zones)| PlayerZoneEntry {
                    player_id: pid.clone(),
                    cards: zones
                        .graveyard
                        .iter()
                        .filter_map(|id| state.objects.get(id).map(CardInfo::from))
                        .collect(),
                })
                .collect(),
        ),
        exile: Some(
            state
                .exile
                .iter()
                .filter_map(|id| state.objects.get(id).map(CardInfo::from))
                .collect(),
        ),
        command: Some(
            state
                .command
                .iter()
                .filter_map(|id| state.objects.get(id).map(CardInfo::from))
                .collect(),
        ),
        stack: Some(
            state
                .stack
                .entries()
                .iter()
                .map(|entry| {
                    use crate::game::stack::StackEntryKind;
                    let (name, oracle_id, object_id) = match &entry.kind {
                        StackEntryKind::Spell { object_id } => {
                            let card = state.objects.get(object_id);
                            (
                                card.map(|c| c.definition.name.clone()).unwrap_or_default(),
                                card.map(|c| c.definition.oracle_id.clone()),
                                Some(*object_id as i64),
                            )
                        }
                        StackEntryKind::Ability { source_id, .. } => {
                            let card = state.objects.get(source_id);
                            (
                                format!(
                                    "{} ability",
                                    card.map(|c| c.definition.name.as_str())
                                        .unwrap_or("Unknown")
                                ),
                                card.map(|c| c.definition.oracle_id.clone()),
                                None,
                            )
                        }
                    };
                    StackEntryInfo {
                        name,
                        controller: entry.controller.clone(),
                        object_id,
                        oracle_id,
                        targets: entry.targets.iter().map(Into::into).collect(),
                    }
                })
                .collect(),
        ),
    })
}

pub async fn submit_action(
    input: input::SubmitActionInput,
    Extension(store): Extension<Arc<GameStore>>,
) -> Result<output::SubmitActionOutput, SubmitActionError> {
    let mut state = get_game::<SubmitActionError>(&store, &input.game_id).await?;

    let is_pass = matches!(&input.action, ActionInput::PassPriority(_));

    match &input.action {
        ActionInput::PassPriority(_) => {
            engine::actions::pass_priority(&mut state, &input.player_id)?;
        }
        ActionInput::PlayLand(play) => {
            engine::actions::play_land(&mut state, &input.player_id, play.object_id as u64)?;
        }
        ActionInput::CastSpell(cast) => {
            let payments: Vec<_> = cast.mana_payment.iter().map(Into::into).collect();
            let targets: Vec<_> = cast
                .targets
                .as_deref()
                .unwrap_or_default()
                .iter()
                .map(Into::into)
                .collect();
            engine::actions::cast_spell(
                &mut state,
                &input.player_id,
                cast.object_id as u64,
                &payments,
                targets,
            )?;
        }
        ActionInput::ActivateManaAbility(act) => {
            engine::actions::activate_mana_ability(
                &mut state,
                &input.player_id,
                act.object_id as u64,
                act.ability_index as usize,
            )?;
        }
        ActionInput::DeclareAttackers(decl) => {
            let attackers = decl.attackers.iter().map(Into::into).collect();
            engine::actions::combat::declare_attackers(&mut state, &input.player_id, attackers)?;
        }
        ActionInput::DeclareBlockers(decl) => {
            let blockers = decl.blockers.iter().map(Into::into).collect();
            engine::actions::combat::declare_blockers(&mut state, &input.player_id, blockers)?;
        }
        ActionInput::ChooseFirstPlayer(choose) => {
            engine::actions::pregame::choose_first_player(
                &mut state,
                &input.player_id,
                &choose.first_player_id,
            )?;
        }
        ActionInput::Mulligan(_) => {
            engine::actions::pregame::mulligan(&mut state, &input.player_id)?;
        }
        ActionInput::KeepHand(keep) => {
            let cards: Vec<u64> = keep
                .cards_to_bottom
                .as_deref()
                .unwrap_or_default()
                .iter()
                .map(|&id| id as u64)
                .collect();
            engine::actions::pregame::keep_hand(&mut state, &input.player_id, &cards)?;
        }
        ActionInput::Concede(_) => {
            engine::actions::concede(&mut state, &input.player_id)?;
        }
        _ => {
            return Err(engine::actions::ActionError::Illegal("unsupported action".into()).into());
        }
    };

    // CR 117.3c — Auto-pass priority unless the player explicitly holds it.
    // Mana abilities and playing lands don't use the stack, so the player
    // retains priority. PassPriority handles its own passing.
    let hold = input.hold_priority.unwrap_or(false);
    let no_auto_pass = is_pass
        || matches!(&input.action, ActionInput::ActivateManaAbility(_))
        || matches!(&input.action, ActionInput::PlayLand(_));
    if !no_auto_pass && !hold && state.has_priority(&input.player_id) {
        engine::actions::pass_priority(&mut state, &input.player_id)?;
    }

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
