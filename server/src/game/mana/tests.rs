use super::*;

#[test]
fn empty_cost_has_zero_value() {
    let cost = ManaCost { symbols: vec![] };
    assert_eq!(cost.mana_value(), 0);
}

#[test]
fn single_colored_mana() {
    let cost = ManaCost {
        symbols: vec![ManaSymbol::Colored(Color::Red)],
    };
    assert_eq!(cost.mana_value(), 1);
}

#[test]
fn generic_mana_contributes_its_value() {
    let cost = ManaCost {
        symbols: vec![ManaSymbol::Generic(3)],
    };
    assert_eq!(cost.mana_value(), 3);
}

#[test]
fn x_contributes_zero() {
    let cost = ManaCost {
        symbols: vec![ManaSymbol::X],
    };
    assert_eq!(cost.mana_value(), 0);
}

#[test]
fn monocolored_hybrid_contributes_two() {
    let cost = ManaCost {
        symbols: vec![ManaSymbol::MonocoloredHybrid(Color::White)],
    };
    assert_eq!(cost.mana_value(), 2);
}

#[test]
fn mixed_cost_sums_correctly() {
    // {2}{R}{U} = 4
    let cost = ManaCost {
        symbols: vec![
            ManaSymbol::Generic(2),
            ManaSymbol::Colored(Color::Red),
            ManaSymbol::Colored(Color::Blue),
        ],
    };
    assert_eq!(cost.mana_value(), 4);
}

#[test]
fn phyrexian_mana() {
    let cost = ManaCost {
        symbols: vec![ManaSymbol::Phyrexian(Color::Black)],
    };
    assert_eq!(cost.mana_value(), 1);
}

#[test]
fn hybrid_mana() {
    let cost = ManaCost {
        symbols: vec![ManaSymbol::Hybrid(Color::White, Color::Blue)],
    };
    assert_eq!(cost.mana_value(), 1);
}

#[test]
fn snow_mana() {
    let cost = ManaCost {
        symbols: vec![ManaSymbol::Snow],
    };
    assert_eq!(cost.mana_value(), 1);
}

#[test]
fn colorless_mana() {
    let cost = ManaCost {
        symbols: vec![ManaSymbol::Colorless],
    };
    assert_eq!(cost.mana_value(), 1);
}

#[test]
fn colorless_hybrid_mana() {
    let cost = ManaCost {
        symbols: vec![ManaSymbol::ColorlessHybrid(Color::Green)],
    };
    assert_eq!(cost.mana_value(), 1);
}

#[test]
fn hybrid_phyrexian_mana() {
    let cost = ManaCost {
        symbols: vec![ManaSymbol::HybridPhyrexian(Color::White, Color::Blue)],
    };
    assert_eq!(cost.mana_value(), 1);
}

// --- ManaPool tests ---

#[test]
fn empty_pool() {
    let pool = ManaPool::default();
    assert!(pool.is_empty());
    assert_eq!(pool.available(ManaType::Green), 0);
}

#[test]
fn add_unrestricted_mana() {
    let mut pool = ManaPool::default();
    pool.add(ManaType::Green, 3);
    assert_eq!(pool.available(ManaType::Green), 3);
    assert_eq!(pool.available(ManaType::Red), 0);
}

#[test]
fn spend_succeeds_when_available() {
    let mut pool = ManaPool::default();
    pool.add(ManaType::Blue, 2);
    assert!(pool.spend(ManaType::Blue, 1));
    assert_eq!(pool.available(ManaType::Blue), 1);
}

#[test]
fn spend_fails_when_insufficient() {
    let mut pool = ManaPool::default();
    pool.add(ManaType::Red, 1);
    assert!(!pool.spend(ManaType::Red, 2));
    assert_eq!(pool.available(ManaType::Red), 1); // unchanged
}

#[test]
fn clear_empties_all() {
    let mut pool = ManaPool::default();
    pool.add(ManaType::White, 3);
    pool.add(ManaType::Black, 2);
    pool.add_restricted(ManaType::Green, 1, ManaRestriction::CreatureSpell);
    pool.clear();
    assert!(pool.is_empty());
}

#[test]
fn add_restricted_mana() {
    let mut pool = ManaPool::default();
    pool.add_restricted(ManaType::Red, 2, ManaRestriction::CreatureSpell);
    assert_eq!(pool.available(ManaType::Red), 0); // restricted doesn't count as unrestricted
    assert_eq!(pool.red.restricted.len(), 1);
    assert_eq!(pool.red.restricted[0].amount, 2);
}

#[test]
fn add_restricted_stacks_same_restriction() {
    let mut pool = ManaPool::default();
    pool.add_restricted(ManaType::Blue, 1, ManaRestriction::CreatureSpell);
    pool.add_restricted(ManaType::Blue, 2, ManaRestriction::CreatureSpell);
    assert_eq!(pool.blue.restricted.len(), 1);
    assert_eq!(pool.blue.restricted[0].amount, 3);
}
