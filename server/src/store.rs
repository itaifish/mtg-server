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
                name TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'WaitingForPlayers',
                player_count INTEGER NOT NULL DEFAULT 0,
                format TEXT NOT NULL DEFAULT 'STANDARD',
                state JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )",
            &[],
        )
        .await?;

        // Add columns if they don't exist (migration for existing tables)
        for col in &[
            "ALTER TABLE games ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''",
            "ALTER TABLE games ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'WaitingForPlayers'",
            "ALTER TABLE games ADD COLUMN IF NOT EXISTS player_count INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE games ADD COLUMN IF NOT EXISTS format TEXT NOT NULL DEFAULT 'STANDARD'",
            "ALTER TABLE games ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
        ] {
            let _ = db.execute(*col, &[]).await;
        }

        // Index for listing/searching
        let _ = db.execute(
            "CREATE INDEX IF NOT EXISTS idx_games_status_created ON games (status, created_at DESC)",
            &[],
        ).await;

        Ok(Arc::new(Self {
            games: RwLock::new(HashMap::new()),
            db,
        }))
    }

    /// Insert a new game into memory and persist to DB.
    pub async fn create(&self, state: GameState) -> Result<(), anyhow::Error> {
        let json = serde_json::to_value(&state)?;
        let status = format!("{:?}", state.status);
        let player_count = state.players.len() as i32;
        let name = &state.name;
        self.db
            .execute(
                "INSERT INTO games (game_id, name, status, player_count, format, state)
                 VALUES ($1, $2, $3, $4, $5, $6)",
                &[
                    &state.game_id,
                    &name,
                    &status,
                    &player_count,
                    &"STANDARD",
                    &json,
                ],
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
                    self.games
                        .write()
                        .await
                        .insert(game_id.to_string(), state.clone());
                    Ok(Some(state))
                }
                Err(e) => {
                    tracing::warn!(game_id, %e, "stale game data, deleting");
                    self.db
                        .execute("DELETE FROM games WHERE game_id = $1", &[&game_id])
                        .await?;
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
        let status = format!("{:?}", state.status);
        let player_count = state.players.len() as i32;
        self.db
            .execute(
                "UPDATE games SET state = $2, status = $3, player_count = $4, updated_at = NOW()
                 WHERE game_id = $1",
                &[&state.game_id, &json, &status, &player_count],
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

    /// List games with filtering, search, sorting, and pagination.
    /// Excludes finished games by default. Uses indexed columns, not JSONB.
    pub async fn list(
        &self,
        status: Option<GameStatus>,
        search: Option<&str>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<GameListItem>, anyhow::Error> {
        let status_filter = status.map(|s| format!("{:?}", s));

        let rows = if let Some(name_search) = search {
            let pattern = format!("%{}%", name_search);
            if let Some(status_str) = &status_filter {
                self.db
                    .query(
                        "SELECT game_id, name, status, player_count, format, created_at
                         FROM games
                         WHERE status = $1 AND name ILIKE $2
                         ORDER BY created_at DESC
                         LIMIT $3 OFFSET $4",
                        &[status_str, &pattern, &limit, &offset],
                    )
                    .await?
            } else {
                self.db
                    .query(
                        "SELECT game_id, name, status, player_count, format, created_at
                         FROM games
                         WHERE status != 'Finished' AND name ILIKE $1
                         ORDER BY created_at DESC
                         LIMIT $2 OFFSET $3",
                        &[&pattern, &limit, &offset],
                    )
                    .await?
            }
        } else if let Some(status_str) = &status_filter {
            self.db
                .query(
                    "SELECT game_id, name, status, player_count, format, created_at
                     FROM games
                     WHERE status = $1
                     ORDER BY created_at DESC
                     LIMIT $2 OFFSET $3",
                    &[status_str, &limit, &offset],
                )
                .await?
        } else {
            self.db
                .query(
                    "SELECT game_id, name, status, player_count, format, created_at
                     FROM games
                     WHERE status != 'Finished'
                     ORDER BY created_at DESC
                     LIMIT $1 OFFSET $2",
                    &[&limit, &offset],
                )
                .await?
        };

        Ok(rows
            .iter()
            .map(|row| GameListItem {
                game_id: row.get(0),
                name: row.get(1),
                status: row.get(2),
                player_count: row.get(3),
                format: row.get(4),
            })
            .collect())
    }
}

/// Lightweight game info for listing — no full state deserialization.
pub struct GameListItem {
    pub game_id: String,
    pub name: String,
    pub status: String,
    pub player_count: i32,
    pub format: String,
}
