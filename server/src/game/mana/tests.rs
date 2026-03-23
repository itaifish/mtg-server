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
