use std::collections::{HashMap, HashSet};

use super::*;
use crate::game::phases_and_steps::{BeginningStep, Phase};

pub fn two_player_game() -> GameState {
    let p1 = "alice".to_string();
    let p2 = "bob".to_string();
    let mut player_zones = HashMap::new();
    player_zones.insert(
        p1.clone(),
        PlayerZones { library: vec![], hand: HashSet::new(), graveyard: vec![] },
    );
    player_zones.insert(
        p2.clone(),
        PlayerZones { library: vec![], hand: HashSet::new(), graveyard: vec![] },
    );

    GameState {
        game_id: "game1".into(),
        status: GameStatus::InProgress,
        players: vec![
            Player { id: p1, name: "Alice".into(), life_total: 20, has_lost: false, poison_counters: 0 },
            Player { id: p2, name: "Bob".into(), life_total: 20, has_lost: false, poison_counters: 0 },
        ],
        turn_order: vec![0, 1],
        active_player_index: 0,
        turn_number: 1,
        phase: Phase::Beginning(BeginningStep::Untap),
        player_zones,
        battlefield: HashSet::new(),
        stack: vec![],
        exile: HashSet::new(),
        command: HashSet::new(),
        objects: HashMap::new(),
        next_object_id: 1,
        rng_seed: 42,
        action_count: 0,
        lands_played_this_turn: 0,
    }
}
