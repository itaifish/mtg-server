use super::*;

#[test]
fn is_public_for_shared_zones() {
    assert!(ZoneType::Battlefield.is_public());
    assert!(ZoneType::Stack.is_public());
    assert!(ZoneType::Exile.is_public());
    assert!(ZoneType::Command.is_public());
    assert!(ZoneType::Graveyard.is_public());
}

#[test]
fn is_not_public_for_hidden_zones() {
    assert!(!ZoneType::Library.is_public());
    assert!(!ZoneType::Hand.is_public());
}

#[test]
fn is_per_player_for_personal_zones() {
    assert!(ZoneType::Library.is_per_player());
    assert!(ZoneType::Hand.is_per_player());
    assert!(ZoneType::Graveyard.is_per_player());
}

#[test]
fn is_not_per_player_for_shared_zones() {
    assert!(!ZoneType::Battlefield.is_per_player());
    assert!(!ZoneType::Stack.is_per_player());
    assert!(!ZoneType::Exile.is_per_player());
    assert!(!ZoneType::Command.is_per_player());
}
