use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::RwLock;
use tokio_postgres::Client;

use crate::game::state::{GameState, GameStatus};

/// In-memory game store backed by Postgres.
/// Games live in memory for the sticky-session host; the DB is written on
/// every mutation so games survive crashes and rebalances.
pub struct GameStore {
    games: RwLock<HashMap<String, GameState>>,
    db: Client,
}

impl GameStore {
    pub async fn new(db: Client) -> Result<Arc<Self>, anyhow::Error> {
        db.execute(
            "CREATE TABLE IF NOT EXISTS games (
                game_id TEXT PRIMARY KEY,
                state JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )",
            &[],
        )
        .await?;

        Ok(Arc::new(Self {
            games: RwLock::new(HashMap::new()),
            db,
        }))
    }

    /// Insert a new game into memory and persist to DB.
    pub async fn create(&self, state: GameState) -> Result<(), anyhow::Error> {
        let json = serde_json::to_value(&state)?;
        self.db
            .execute(
                "INSERT INTO games (game_id, state) VALUES ($1, $2)",
                &[&state.game_id, &json],
            )
            .await?;
        self.games
            .write()
            .await
            .insert(state.game_id.clone(), state);
        Ok(())
    }

    /// Get a game, loading from DB into memory if not cached.
    pub async fn get(&self, game_id: &str) -> Result<Option<GameState>, anyhow::Error> {
        if let Some(state) = self.games.read().await.get(game_id) {
            return Ok(Some(state.clone()));
        }

        let row = self
            .db
            .query_opt("SELECT state FROM games WHERE game_id = $1", &[&game_id])
            .await?;

        if let Some(row) = row {
            let json: serde_json::Value = row.get(0);
            match serde_json::from_value::<GameState>(json) {
                Ok(state) => {
                    self.games.write().await.insert(game_id.to_string(), state.clone());
                    Ok(Some(state))
                }
                Err(e) => {
                    tracing::warn!(game_id, %e, "stale game data, deleting");
                    self.db.execute("DELETE FROM games WHERE game_id = $1", &[&game_id]).await?;
                    Ok(None)
                }
            }
        } else {
            Ok(None)
        }
    }

    /// Update a game in memory and persist to DB.
    pub async fn update(&self, state: GameState) -> Result<(), anyhow::Error> {
        let json = serde_json::to_value(&state)?;
        self.db
            .execute(
                "UPDATE games SET state = $2, updated_at = NOW() WHERE game_id = $1",
                &[&state.game_id, &json],
            )
            .await?;
        self.games
            .write()
            .await
            .insert(state.game_id.clone(), state);
        Ok(())
    }

    /// Delete a game from memory and DB.
    pub async fn delete(&self, game_id: &str) -> Result<(), anyhow::Error> {
        self.db
            .execute("DELETE FROM games WHERE game_id = $1", &[&game_id])
            .await?;
        self.games.write().await.remove(game_id);
        Ok(())
    }

    /// List all games, optionally filtered by status.
    pub async fn list(&self, status: Option<GameStatus>) -> Result<Vec<GameState>, anyhow::Error> {
        let rows = self
            .db
            .query("SELECT state FROM games", &[])
            .await?;

        let mut games = Vec::new();
        for row in rows {
            let json: serde_json::Value = row.get(0);
            let state: GameState = match serde_json::from_value(json) {
                Ok(s) => s,
                Err(_) => continue, // skip stale schema
            };
            if let Some(filter) = &status {
                if state.status == *filter {
                    games.push(state);
                }
            } else {
                games.push(state);
            }
        }
        Ok(games)
    }
}
