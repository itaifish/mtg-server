use crate::cards::card_by_name;
use crate::engine::actions::{play_land, resolve_choice};
use crate::game::card::{CardInstance, ObjectId};
use crate::game::phases_and_steps::Phase;
use crate::game::state::tests_helper::two_player_game;
use crate::game::zone::ZoneType;

fn game_ready_for_land() -> crate::game::state::GameState {
    let mut state = two_player_game();
    state.phase = Phase::PrecombatMain;
    state
}

fn add_to_hand(state: &mut crate::game::state::GameState, name: &str, owner: &str) -> ObjectId {
    let def = card_by_name(name).unwrap().clone();
    let id = state.new_object_id();
    let instance = CardInstance::new(id, owner, def);
    state.objects.insert(id, instance);
    state.player_zones.get_mut(owner).unwrap().hand.insert(id);
    id
}

#[test]
fn arena_of_glory_enters_tapped_without_mountain() {
    let mut state = game_ready_for_land();
    let id = add_to_hand(&mut state, "Arena of Glory", "alice");
    play_land(&mut state, "alice", id).unwrap();

    assert!(state.battlefield.contains(&id));
    assert!(state.objects.get(&id).unwrap().tapped);
}

#[test]
fn arena_of_glory_enters_untapped_with_mountain() {
    let mut state = game_ready_for_land();

    // Put a Mountain on the battlefield
    let mtn_id = state.new_object_id();
    let mtn = CardInstance::new(mtn_id, "alice", card_by_name("Mountain").unwrap().clone());
    state.objects.insert(mtn_id, mtn);
    state.battlefield.insert(mtn_id);

    let id = add_to_hand(&mut state, "Arena of Glory", "alice");
    play_land(&mut state, "alice", id).unwrap();

    assert!(state.battlefield.contains(&id));
    assert!(!state.objects.get(&id).unwrap().tapped);
}

#[test]
fn sacred_foundry_prompts_choice() {
    let mut state = game_ready_for_land();
    let id = add_to_hand(&mut state, "Sacred Foundry", "alice");
    play_land(&mut state, "alice", id).unwrap();

    assert!(!state.battlefield.contains(&id), "should not be on battlefield yet");
    assert!(state.pending_choice.is_some());
    assert_eq!(state.pending_choice.as_ref().unwrap().player_id, "alice");
}

#[test]
fn sacred_foundry_pay_life_enters_untapped() {
    let mut state = game_ready_for_land();
    let life_before = state.get_player("alice").unwrap().life_total;
    let id = add_to_hand(&mut state, "Sacred Foundry", "alice");
    play_land(&mut state, "alice", id).unwrap();

    resolve_choice(&mut state, "alice", true).unwrap();

    assert!(state.battlefield.contains(&id));
    assert!(!state.objects.get(&id).unwrap().tapped);
    assert_eq!(state.get_player("alice").unwrap().life_total, life_before - 2);
    assert!(state.pending_choice.is_none());
}

#[test]
fn sacred_foundry_decline_enters_tapped() {
    let mut state = game_ready_for_land();
    let life_before = state.get_player("alice").unwrap().life_total;
    let id = add_to_hand(&mut state, "Sacred Foundry", "alice");
    play_land(&mut state, "alice", id).unwrap();

    resolve_choice(&mut state, "alice", false).unwrap();

    assert!(state.battlefield.contains(&id));
    assert!(state.objects.get(&id).unwrap().tapped);
    assert_eq!(state.get_player("alice").unwrap().life_total, life_before);
    assert!(state.pending_choice.is_none());
}

#[test]
fn basic_land_enters_untapped_no_choice() {
    let mut state = game_ready_for_land();
    let id = add_to_hand(&mut state, "Plains", "alice");
    play_land(&mut state, "alice", id).unwrap();

    assert!(state.battlefield.contains(&id));
    assert!(!state.objects.get(&id).unwrap().tapped);
    assert!(state.pending_choice.is_none());
}

#[test]
fn wrong_player_cannot_answer_choice() {
    let mut state = game_ready_for_land();
    let id = add_to_hand(&mut state, "Sacred Foundry", "alice");
    play_land(&mut state, "alice", id).unwrap();

    let result = resolve_choice(&mut state, "bob", true);
    assert!(result.is_err());
    assert!(state.pending_choice.is_some());
}
