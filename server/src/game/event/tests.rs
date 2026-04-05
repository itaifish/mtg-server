use super::*;
use crate::game::card::CardDefinition;
use crate::game::effect::{Effect, PlayerSpec, TargetSpec, Value};

fn empty_objects() -> HashMap<ObjectId, CardInstance> {
    HashMap::new()
}

fn objects_with_creature(id: ObjectId) -> HashMap<ObjectId, CardInstance> {
    let mut map = HashMap::new();
    map.insert(id, CardInstance::new(id, "alice", CardDefinition {
        card_types: vec![CardType::Creature],
        ..Default::default()
    }));
    map
}

fn etb_self_trigger(effect: Effect) -> TriggeredAbility {
    TriggeredAbility {
        trigger: TriggerEvent::EntersZone { zone: ZoneType::Battlefield },
        filters: vec![TriggerFilter::IsSelf],
        effect,
        needs_targets: false,
        description: "when this enters the battlefield".into(),
    }
}

fn any_creature_dies_trigger(effect: Effect) -> TriggeredAbility {
    TriggeredAbility {
        trigger: TriggerEvent::ZoneTransition {
            from: ZoneType::Battlefield,
            to: ZoneType::Graveyard,
        },
        filters: vec![
            TriggerFilter::ObjectMatches(vec![Filter::HasType("Creature".into())]),
        ],
        effect,
        needs_targets: false,
        description: "whenever a creature dies".into(),
    }
}

fn your_creature_etb_trigger(effect: Effect) -> TriggeredAbility {
    TriggeredAbility {
        trigger: TriggerEvent::EntersZone { zone: ZoneType::Battlefield },
        filters: vec![
            TriggerFilter::ObjectMatches(vec![Filter::HasType("Creature".into())]),
            TriggerFilter::ControlledBy(TriggerPlayerRef::You),
        ],
        effect,
        needs_targets: false,
        description: "whenever a creature enters the battlefield under your control".into(),
    }
}

#[test]
fn etb_self_matches_own_etb() {
    let trigger = etb_self_trigger(Effect::DrawCards {
        count: Value::Constant(1),
        player: PlayerSpec::Controller,
    });

    let event = GameEvent::ZoneChange {
        object_id: 42,
        from: ZoneType::Stack,
        to: ZoneType::Battlefield,
        owner: "alice".into(),
        controller: Some("alice".into()),
    };

    assert!(trigger_matches(&trigger, &event, 42, "alice", &objects_with_creature(10)));
}

#[test]
fn etb_self_does_not_match_other_object() {
    let trigger = etb_self_trigger(Effect::DrawCards {
        count: Value::Constant(1),
        player: PlayerSpec::Controller,
    });

    let event = GameEvent::ZoneChange {
        object_id: 99,
        from: ZoneType::Stack,
        to: ZoneType::Battlefield,
        owner: "alice".into(),
        controller: Some("alice".into()),
    };

    assert!(!trigger_matches(&trigger, &event, 42, "alice", &objects_with_creature(10)));
}

#[test]
fn your_creature_etb_matches_your_creature() {
    let trigger = your_creature_etb_trigger(Effect::GainLife {
        amount: Value::Constant(1),
        player: PlayerSpec::Controller,
    });

    let event = GameEvent::ZoneChange {
        object_id: 10,
        from: ZoneType::Hand,
        to: ZoneType::Battlefield,
        owner: "alice".into(),
        controller: Some("alice".into()),
    };

    assert!(trigger_matches(&trigger, &event, 42, "alice", &objects_with_creature(10)));
}

#[test]
fn your_creature_etb_does_not_match_opponent_creature() {
    let trigger = your_creature_etb_trigger(Effect::GainLife {
        amount: Value::Constant(1),
        player: PlayerSpec::Controller,
    });

    let event = GameEvent::ZoneChange {
        object_id: 10,
        from: ZoneType::Hand,
        to: ZoneType::Battlefield,
        owner: "bob".into(),
        controller: Some("bob".into()),
    };

    assert!(!trigger_matches(&trigger, &event, 42, "alice", &objects_with_creature(10)));
}

#[test]
fn dies_trigger_matches_battlefield_to_graveyard() {
    let trigger = any_creature_dies_trigger(Effect::DealDamage {
        amount: Value::Constant(1),
        target: TargetSpec::Each(crate::game::effect::Selector::Players {
            filters: vec![],
        }),
    });

    let event = GameEvent::ZoneChange {
        object_id: 10,
        from: ZoneType::Battlefield,
        to: ZoneType::Graveyard,
        owner: "bob".into(),
        controller: Some("bob".into()),
    };

    assert!(trigger_matches(&trigger, &event, 42, "alice", &objects_with_creature(10)));
}

#[test]
fn dies_trigger_does_not_match_hand_to_graveyard() {
    let trigger = any_creature_dies_trigger(Effect::GainLife {
        amount: Value::Constant(1),
        player: PlayerSpec::Controller,
    });

    let event = GameEvent::ZoneChange {
        object_id: 10,
        from: ZoneType::Hand,
        to: ZoneType::Graveyard,
        owner: "bob".into(),
        controller: Some("bob".into()),
    };

    assert!(!trigger_matches(&trigger, &event, 42, "alice", &objects_with_creature(10)));
}

#[test]
fn combat_damage_filter_works() {
    let trigger = TriggeredAbility {
        trigger: TriggerEvent::DamageDealt,
        filters: vec![
            TriggerFilter::IsSelf,
            TriggerFilter::IsCombatDamage,
            TriggerFilter::DamageTargetIsPlayer,
        ],
        effect: Effect::DrawCards {
            count: Value::Constant(1),
            player: PlayerSpec::Controller,
        },
        needs_targets: false,
        description: "whenever this deals combat damage to a player".into(),
    };

    let combat_to_player = GameEvent::DamageDealt {
        source_id: 42,
        target: DamageTarget::Player("bob".into()),
        amount: 3,
        is_combat: true,
    };
    assert!(trigger_matches(&trigger, &combat_to_player, 42, "alice", &empty_objects()));

    let noncombat = GameEvent::DamageDealt {
        source_id: 42,
        target: DamageTarget::Player("bob".into()),
        amount: 3,
        is_combat: false,
    };
    assert!(!trigger_matches(&trigger, &noncombat, 42, "alice", &empty_objects()));

    let combat_to_creature = GameEvent::DamageDealt {
        source_id: 42,
        target: DamageTarget::Object(99),
        amount: 3,
        is_combat: true,
    };
    assert!(!trigger_matches(&trigger, &combat_to_creature, 42, "alice", &empty_objects()));
}
