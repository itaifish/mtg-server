import type { LegalActionType, ManaType, TargetKind } from './enums';

export interface DecklistEntry {
  cardName: string;
  count: number;
}

export interface ManaPoolSlotInfo {
  unrestricted: number;
}

export interface ManaPoolInfo {
  white: ManaPoolSlotInfo;
  blue: ManaPoolSlotInfo;
  black: ManaPoolSlotInfo;
  red: ManaPoolSlotInfo;
  green: ManaPoolSlotInfo;
  colorless: ManaPoolSlotInfo;
}

export interface PlayerInfo {
  playerId: string;
  name: string;
  lifeTotal: number;
  ready: boolean;
  handSize: number;
  librarySize: number;
  poisonCounters: number;
  mulliganCount: number;
  hasKept: boolean;
  manaPool?: ManaPoolInfo;
}

export interface TargetRequirement {
  validKinds: TargetKind[];
}

export interface LegalAction {
  actionType: LegalActionType;
  objectId?: number;
  abilityIndex?: number;
  targetRequirements?: TargetRequirement[];
  manaCost?: string[];
}

export interface SymbolPaymentEntry {
  paidWith: ManaType[];
}

export interface AttackerEntry {
  objectId: number;
  targetPlayerId: string;
}

export interface BlockerEntry {
  objectId: number;
  blockingId: number;
}

export interface PlayerTarget {
  playerId: string;
}

export interface ObjectTarget {
  objectId: number;
}
