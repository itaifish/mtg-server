use crate::game::state::{GameState, GameStatus};

/// CR 704 — State-based actions are checked whenever a player would receive
/// priority. They don't use the stack and happen simultaneously.
/// This function runs repeatedly until no more SBAs apply.
pub fn check(state: &mut GameState) {
    loop {
        if !check_once(state) {
            break;
        }
    }
}

/// Run one pass of state-based actions. Returns true if any were applied.
fn check_once(state: &mut GameState) -> bool {
    let mut changed = false;

    // CR 704.5a — A player with 0 or less life loses.
    for player in &mut state.players {
        if !player.has_lost && player.life_total <= 0 {
            player.has_lost = true;
            changed = true;
            // TODO: call eliminate_player cleanup (remove owned objects)
        }
    }

    // CR 704.5c — A player with 10 or more poison counters loses.
    for player in &mut state.players {
        if !player.has_lost && player.poison_counters >= 10 {
            player.has_lost = true;
            changed = true;
        }
    }

    // CR 704.5f — A creature with toughness 0 or less is put into its
    // owner's graveyard.
    // TODO: implement once we track effective toughness on the battlefield

    // CR 704.5i — A planeswalker with 0 or less loyalty is put into its
    // owner's graveyard.
    // TODO: implement once planeswalkers are supported

    // CR 704.5j — +1/+1 and -1/-1 counters annihilate.
    // TODO: implement counter annihilation

    // Check if game is over
    if state.alive_count() <= 1 && state.status != GameStatus::Finished {
        state.status = GameStatus::Finished;
        changed = true;
    }

    changed
}

#[cfg(test)]
mod tests;
