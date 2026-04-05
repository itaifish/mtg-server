use super::*;
use crate::game::mana::{ManaProduction, ManaType};

fn expect_mana(ability: &Ability, mana_type: ManaType) {
    assert_eq!(
        ability.effect,
        AbilityEffect::AddMana(vec![ManaProduction::new(mana_type, 1)])
    );
}

#[test]
fn plains_has_white_mana_ability() {
    let ability = intrinsic_land_ability("Plains").unwrap();
    assert!(ability.is_mana_ability);
    assert_eq!(ability.costs, vec![AbilityCost::TapSelf]);
    expect_mana(&ability, ManaType::White);
}

#[test]
fn island_has_blue_mana_ability() {
    expect_mana(&intrinsic_land_ability("Island").unwrap(), ManaType::Blue);
}

#[test]
fn swamp_has_black_mana_ability() {
    expect_mana(&intrinsic_land_ability("Swamp").unwrap(), ManaType::Black);
}

#[test]
fn mountain_has_red_mana_ability() {
    expect_mana(&intrinsic_land_ability("Mountain").unwrap(), ManaType::Red);
}

#[test]
fn forest_has_green_mana_ability() {
    expect_mana(&intrinsic_land_ability("Forest").unwrap(), ManaType::Green);
}

#[test]
fn nonbasic_subtype_returns_none() {
    assert!(intrinsic_land_ability("Desert").is_none());
    assert!(intrinsic_land_ability("Locus").is_none());
}

#[test]
fn all_abilities_includes_intrinsic() {
    use crate::game::card::{CardDefinition, CardType, Supertype};
    use crate::game::mana::Color;

    let def = CardDefinition {
        name: "Forest".into(),
        card_types: vec![CardType::Land],
        subtypes: vec!["Forest".into()],
        supertypes: vec![Supertype::Basic],
        ..Default::default()
    };

    let abilities = all_abilities(&def);
    assert_eq!(abilities.len(), 1);
    assert!(abilities[0].is_mana_ability);
    expect_mana(&abilities[0], ManaType::Green);
}
