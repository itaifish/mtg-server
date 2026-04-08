import type {
  AttackerEntry,
  BlockerEntry,
  ObjectTarget,
  PlayerTarget,
  SymbolPaymentEntry,
} from './models';
import type { AutoPassMode, GamePhase } from './enums';

// Individual action interfaces
export interface PassPriorityAction {}

export interface PlayLandAction {
  objectId: number;
}

export interface CastSpellAction {
  objectId: number;
  manaPayment: SymbolPaymentEntry[];
  targets?: SpellTarget[];
  modeChoices?: number[];
}

export interface ActivateManaAbilityAction {
  objectId: number;
  abilityIndex: number;
}

export interface DeclareAttackersAction {
  attackers: AttackerEntry[];
}

export interface DeclareBlockersAction {
  blockers: BlockerEntry[];
}

export interface ChooseFirstPlayerAction {
  firstPlayerId: string;
}

export interface KeepHandAction {
  cardsToBottom?: number[];
}

export interface MulliganAction {}

export interface ConcedeAction {}

export interface SetAutoPassAction {
  mode: AutoPassMode;
  stopAtPhase?: GamePhase;
}

// SpellTarget discriminated union
export type SpellTarget =
  | { player: PlayerTarget }
  | { object: ObjectTarget };

// ActionInput tagged union — exactly one key present
export type ActionInput =
  | { passPriority: PassPriorityAction }
  | { playLand: PlayLandAction }
  | { castSpell: CastSpellAction }
  | { activateManaAbility: ActivateManaAbilityAction }
  | { declareAttackers: DeclareAttackersAction }
  | { declareBlockers: DeclareBlockersAction }
  | { chooseFirstPlayer: ChooseFirstPlayerAction }
  | { keepHand: KeepHandAction }
  | { mulligan: MulliganAction }
  | { concede: ConcedeAction }
  | { setAutoPass: SetAutoPassAction };

// Helper functions
export function createPassPriority(): ActionInput {
  return { passPriority: {} };
}

export function createPlayLand(objectId: number): ActionInput {
  return { playLand: { objectId } };
}

export function createCastSpell(
  objectId: number,
  manaPayment: SymbolPaymentEntry[],
  targets?: SpellTarget[],
  modeChoices?: number[],
): ActionInput {
  return { castSpell: { objectId, manaPayment, targets, modeChoices } };
}

export function createActivateManaAbility(
  objectId: number,
  abilityIndex: number,
): ActionInput {
  return { activateManaAbility: { objectId, abilityIndex } };
}

export function createDeclareAttackers(
  attackers: AttackerEntry[],
): ActionInput {
  return { declareAttackers: { attackers } };
}

export function createDeclareBlockers(blockers: BlockerEntry[]): ActionInput {
  return { declareBlockers: { blockers } };
}

export function createChooseFirstPlayer(firstPlayerId: string): ActionInput {
  return { chooseFirstPlayer: { firstPlayerId } };
}

export function createKeepHand(cardsToBottom?: number[]): ActionInput {
  return { keepHand: { cardsToBottom } };
}

export function createMulligan(): ActionInput {
  return { mulligan: {} };
}

export function createConcede(): ActionInput {
  return { concede: {} };
}

export function createSetAutoPass(mode: AutoPassMode, stopAtPhase?: GamePhase): ActionInput {
  return { setAutoPass: { mode, stopAtPhase } };
}

// Type guard helpers
export function isPlayerTarget(
  target: SpellTarget,
): target is { player: PlayerTarget } {
  return 'player' in target;
}

export function isObjectTarget(
  target: SpellTarget,
): target is { object: ObjectTarget } {
  return 'object' in target;
}

// Helper to create spell targets
export function playerTarget(playerId: string): SpellTarget {
  return { player: { playerId } };
}

export function objectTarget(objectId: number): SpellTarget {
  return { object: { objectId } };
}
