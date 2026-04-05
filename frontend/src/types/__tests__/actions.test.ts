import { describe, it, expect } from 'vitest';
import {
  createPassPriority,
  createPlayLand,
  createCastSpell,
  createActivateManaAbility,
  createDeclareAttackers,
  createDeclareBlockers,
  createChooseFirstPlayer,
  createKeepHand,
  createMulligan,
  createConcede,
  isPlayerTarget,
  isObjectTarget,
  playerTarget,
  objectTarget,
} from '../actions';

describe('action creators', () => {
  it('createPassPriority', () => {
    const action = createPassPriority();
    expect(action).toEqual({ passPriority: {} });
  });

  it('createPlayLand', () => {
    const action = createPlayLand(42);
    expect(action).toEqual({ playLand: { objectId: 42 } });
  });

  it('createCastSpell with targets and modes', () => {
    const action = createCastSpell(
      10,
      [{ paidWith: ['WHITE', 'BLUE'] }],
      [playerTarget('p1')],
      [1],
    );
    expect(action).toEqual({
      castSpell: {
        objectId: 10,
        manaPayment: [{ paidWith: ['WHITE', 'BLUE'] }],
        targets: [{ player: { playerId: 'p1' } }],
        modeChoices: [1],
      },
    });
  });

  it('createCastSpell without optional fields', () => {
    const action = createCastSpell(5, []);
    expect(action).toEqual({
      castSpell: {
        objectId: 5,
        manaPayment: [],
        targets: undefined,
        modeChoices: undefined,
      },
    });
  });

  it('createActivateManaAbility', () => {
    expect(createActivateManaAbility(7, 0)).toEqual({
      activateManaAbility: { objectId: 7, abilityIndex: 0 },
    });
  });

  it('createDeclareAttackers', () => {
    expect(
      createDeclareAttackers([{ objectId: 1, targetPlayerId: 'p2' }]),
    ).toEqual({
      declareAttackers: {
        attackers: [{ objectId: 1, targetPlayerId: 'p2' }],
      },
    });
  });

  it('createDeclareBlockers', () => {
    expect(createDeclareBlockers([{ objectId: 2, blockingId: 1 }])).toEqual({
      declareBlockers: { blockers: [{ objectId: 2, blockingId: 1 }] },
    });
  });

  it('createChooseFirstPlayer', () => {
    expect(createChooseFirstPlayer('p1')).toEqual({
      chooseFirstPlayer: { firstPlayerId: 'p1' },
    });
  });

  it('createKeepHand with cards to bottom', () => {
    expect(createKeepHand([3, 5])).toEqual({
      keepHand: { cardsToBottom: [3, 5] },
    });
  });

  it('createKeepHand without cards', () => {
    expect(createKeepHand()).toEqual({ keepHand: { cardsToBottom: undefined } });
  });

  it('createMulligan', () => {
    expect(createMulligan()).toEqual({ mulligan: {} });
  });

  it('createConcede', () => {
    expect(createConcede()).toEqual({ concede: {} });
  });
});

describe('SpellTarget type guards', () => {
  it('isPlayerTarget returns true for player targets', () => {
    const t = playerTarget('p1');
    expect(isPlayerTarget(t)).toBe(true);
    expect(isObjectTarget(t)).toBe(false);
  });

  it('isObjectTarget returns true for object targets', () => {
    const t = objectTarget(42);
    expect(isObjectTarget(t)).toBe(true);
    expect(isPlayerTarget(t)).toBe(false);
  });
});
