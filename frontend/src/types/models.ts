import type { LegalActionType, ManaType } from './enums';

export interface DecklistEntry {
  cardName: string;
  count: number;
}

export interface PlayerInfo {
  playerId: string;
  name: string;
  lifeTotal: number;
  ready: boolean;
  handSize: number;
  librarySize: number;
  poisonCounters: number;
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
