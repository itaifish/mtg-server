use crate::game::card::CardType;
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
    // CR 704.5c — A player with 10 or more poison counters loses.
    let losers: Vec<String> = state
        .players
        .iter()
        .filter(|p| !p.has_lost && (p.life_total <= 0 || p.poison_counters >= 10))
        .map(|p| p.id.clone())
        .collect();

    for loser in losers {
        state.eliminate_player(&loser);
        changed = true;
    }

    // CR 704.5f — A creature with toughness 0 or less is put into its
    // owner's graveyard.
    // CR 704.5g — A creature with lethal damage (damage >= toughness) is
    // destroyed (put into its owner's graveyard).
    let lethal: Vec<u64> = state
        .battlefield_of_type(CardType::Creature)
        .into_iter()
        .filter(|&id| {
            state
                .objects
                .get(&id)
                .map(|card| {
                    let toughness = card.effective_toughness().unwrap_or(0);
                    toughness <= 0 || card.damage_marked >= toughness as u32
                })
                .unwrap_or(false)
        })
        .collect();

    for id in lethal {
        // TODO: replacement effects (e.g., indestructible, regenerate)
        // TODO: triggered abilities (e.g., dies triggers)
        state.send_to_graveyard(id);
        changed = true;
    }

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
