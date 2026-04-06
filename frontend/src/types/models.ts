import type { LegalActionType, ManaType } from './enums';

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
  manaPool?: ManaPoolInfo;
}

export interface LegalAction {
  actionType: LegalActionType;
  objectId?: number;
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
