use super::*;

#[test]
fn full_turn_sequence() {
    let mut phase = Phase::Beginning(BeginningStep::Untap);
    let expected = vec![
        Phase::Beginning(BeginningStep::Upkeep),
        Phase::Beginning(BeginningStep::Draw),
        Phase::PrecombatMain,
        Phase::Combat(CombatStep::BeginningOfCombat),
        Phase::Combat(CombatStep::DeclareAttackers),
        Phase::Combat(CombatStep::DeclareBlockers),
        Phase::Combat(CombatStep::CombatDamage),
        Phase::Combat(CombatStep::EndOfCombat),
        Phase::PostcombatMain,
        Phase::Ending(EndingStep::End),
        Phase::Ending(EndingStep::Cleanup),
    ];

    for expected_phase in &expected {
        phase = phase.next().expect("should have a next phase");
        assert_eq!(&phase, expected_phase);
    }

    assert_eq!(phase.next(), None, "cleanup should end the turn");
}

#[test]
fn cleanup_returns_none() {
    assert_eq!(Phase::Ending(EndingStep::Cleanup).next(), None);
}
