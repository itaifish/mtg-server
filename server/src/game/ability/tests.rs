use super::*;
use crate::game::mana::ManaType;

#[test]
fn plains_has_white_mana_ability() {
    let ability = intrinsic_land_ability("Plains").unwrap();
    assert!(ability.is_mana_ability);
    assert_eq!(ability.costs, vec![AbilityCost::TapSelf]);
    assert_eq!(
        ability.effect,
        AbilityEffect::AddMana(vec![ManaType::White])
    );
}

#[test]
fn island_has_blue_mana_ability() {
    let ability = intrinsic_land_ability("Island").unwrap();
    assert_eq!(ability.effect, AbilityEffect::AddMana(vec![ManaType::Blue]));
}

#[test]
fn swamp_has_black_mana_ability() {
    let ability = intrinsic_land_ability("Swamp").unwrap();
    assert_eq!(
        ability.effect,
        AbilityEffect::AddMana(vec![ManaType::Black])
    );
}

#[test]
fn mountain_has_red_mana_ability() {
    let ability = intrinsic_land_ability("Mountain").unwrap();
    assert_eq!(ability.effect, AbilityEffect::AddMana(vec![ManaType::Red]));
}

#[test]
fn forest_has_green_mana_ability() {
    let ability = intrinsic_land_ability("Forest").unwrap();
    assert_eq!(
        ability.effect,
        AbilityEffect::AddMana(vec![ManaType::Green])
    );
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
        mana_cost: None,
        colors: vec![],
        card_types: vec![CardType::Land],
        subtypes: vec!["Forest".into()],
        supertypes: vec![Supertype::Basic],
        power: None,
        toughness: None,
        loyalty: None,
        defense: None,
        rules_text: String::new(),
        abilities: vec![],
    };

    let abilities = all_abilities(&def);
    assert_eq!(abilities.len(), 1);
    assert!(abilities[0].is_mana_ability);
    assert_eq!(
        abilities[0].effect,
        AbilityEffect::AddMana(vec![ManaType::Green])
    );
}
