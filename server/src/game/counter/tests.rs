use super::*;

fn plus_one() -> CounterType {
    CounterType::PowerToughness(PtModifier {
        power: 1,
        toughness: 1,
    })
}

fn minus_one() -> CounterType {
    CounterType::PowerToughness(PtModifier {
        power: -1,
        toughness: -1,
    })
}

#[test]
fn pt_modifier_returns_some_for_pt_counter() {
    assert_eq!(
        plus_one().pt_modifier(),
        Some(PtModifier {
            power: 1,
            toughness: 1
        })
    );
}

#[test]
fn pt_modifier_returns_none_for_keyword_counter() {
    assert_eq!(CounterType::Flying.pt_modifier(), None);
}

#[test]
fn keyword_counters_grant_keywords() {
    assert!(CounterType::Flying.grants_keyword());
    assert!(CounterType::Trample.grants_keyword());
    assert!(CounterType::Vigilance.grants_keyword());
    assert!(CounterType::Deathtouch.grants_keyword());
}

#[test]
fn non_keyword_counters_do_not_grant_keywords() {
    assert!(!plus_one().grants_keyword());
    assert!(!CounterType::Shield.grants_keyword());
    assert!(!CounterType::Loyalty.grants_keyword());
    assert!(!CounterType::Named("charge".into()).grants_keyword());
}

#[test]
fn plus_one_annihilates_with_minus_one() {
    assert!(plus_one().annihilates_with(&minus_one()));
    assert!(minus_one().annihilates_with(&plus_one()));
}

#[test]
fn same_sign_does_not_annihilate() {
    assert!(!plus_one().annihilates_with(&plus_one()));
    assert!(!minus_one().annihilates_with(&minus_one()));
}

#[test]
fn non_pt_counters_do_not_annihilate() {
    assert!(!CounterType::Flying.annihilates_with(&CounterType::Flying));
    assert!(!CounterType::Shield.annihilates_with(&CounterType::Stun));
}

#[test]
fn arbitrary_pt_counters_do_not_annihilate() {
    let plus_two = CounterType::PowerToughness(PtModifier {
        power: 2,
        toughness: 2,
    });
    let minus_two = CounterType::PowerToughness(PtModifier {
        power: -2,
        toughness: -2,
    });
    assert!(!plus_two.annihilates_with(&minus_two));
}
