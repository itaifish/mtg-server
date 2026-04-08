use crate::cards::card_by_name;
use crate::deck::loader::{load_deck, DeckEntry};
use crate::engine::actions::pregame::{choose_first_player, keep_hand};
use crate::engine::actions::{activate_mana_ability, cast_spell, pass_priority};
use crate::game::counter::{CounterType, PtModifier};
use crate::game::mana::{ManaType, SymbolPayment};
use crate::game::phases_and_steps::Phase;
use crate::game::stack::{SpellTarget, StackEntry};
use crate::game::state::{GameState, GameStatus, Player};

fn setup_soul_warden_pridemate_game() -> GameState {
    let mut state = GameState::new(
        "test",
        "Test Game",
        vec![Player::new("alice", "Alice"), Player::new("bob", "Bob")],
        42,
    );

    let deck = vec![
        DeckEntry {
            card_name: "Plains".into(),
            count: 20,
        },
        DeckEntry {
            card_name: "Soul Warden".into(),
            count: 4,
        },
        DeckEntry {
            card_name: "Ajani's Pridemate".into(),
            count: 4,
        },
        DeckEntry {
            card_name: "Savannah Lions".into(),
            count: 2,
        },
    ];
    load_deck(&mut state, "alice", &deck).unwrap();
    load_deck(
        &mut state,
        "bob",
        &vec![DeckEntry {
            card_name: "Plains".into(),
            count: 30,
        }],
    )
    .unwrap();

    state.status = GameStatus::InProgress;
    state.turn_number = 1;
    state.phase = Phase::PrecombatMain;

    state
}

#[test]
fn soul_warden_triggers_on_creature_etb() {
    let mut state = setup_soul_warden_pridemate_game();

    // Manually put Soul Warden on the battlefield
    let sw_def = card_by_name("Soul Warden").unwrap().clone();
    let sw = crate::game::card::CardInstance::new(900, "alice", sw_def);
    state.objects.insert(900, sw);
    state.battlefield.insert(900);

    // Put a creature on the battlefield (simulating resolution)
    let lion_def = card_by_name("Savannah Lions").unwrap().clone();
    let lion = crate::game::card::CardInstance::new(901, "alice", lion_def);
    state.objects.insert(901, lion);

    // Move lion to battlefield — this should emit a ZoneChange event
    // and Soul Warden should trigger
    state
        .player_zones
        .get_mut("alice")
        .unwrap()
        .hand
        .insert(901);
    state.move_object(901, crate::game::zone::ZoneType::Battlefield);

    // Soul Warden should have created a pending trigger
    assert_eq!(state.pending_triggers.len(), 1);
    assert_eq!(state.pending_triggers[0].controller, "alice");
    assert_eq!(
        state.pending_triggers[0].description,
        "Whenever another creature enters the battlefield, you gain 1 life."
    );
}

#[test]
fn pridemate_triggers_on_life_gain_from_soul_warden() {
    let mut state = setup_soul_warden_pridemate_game();

    // Put Soul Warden and Ajani's Pridemate on the battlefield
    let sw = crate::game::card::CardInstance::new(
        900,
        "alice",
        card_by_name("Soul Warden").unwrap().clone(),
    );
    let pm = crate::game::card::CardInstance::new(
        901,
        "alice",
        card_by_name("Ajani's Pridemate").unwrap().clone(),
    );
    state.objects.insert(900, sw);
    state.objects.insert(901, pm);
    state.battlefield.insert(900);
    state.battlefield.insert(901);

    // A creature enters — Soul Warden triggers
    let lion = crate::game::card::CardInstance::new(
        902,
        "alice",
        card_by_name("Savannah Lions").unwrap().clone(),
    );
    state.objects.insert(902, lion);
    state
        .player_zones
        .get_mut("alice")
        .unwrap()
        .hand
        .insert(902);
    state.move_object(902, crate::game::zone::ZoneType::Battlefield);

    // Soul Warden triggered
    assert_eq!(state.pending_triggers.len(), 1);

    // Simulate resolving Soul Warden's trigger: gain 1 life
    state.pending_triggers.clear();
    state.gain_life("alice", 1);

    // Ajani's Pridemate should now trigger from the life gain
    assert_eq!(state.pending_triggers.len(), 1);
    assert_eq!(
        state.pending_triggers[0].description,
        "Whenever you gain life, put a +1/+1 counter on Ajani's Pridemate."
    );

    // Verify alice gained life
    assert_eq!(state.get_player("alice").unwrap().life_total, 21);
}
