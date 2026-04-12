import type { GameFormat, GamePhase, GameStatus } from './enums';
import type { ActionInput, SpellTarget } from './actions';
import type { DecklistEntry, LegalAction, PlayerInfo } from './models';

// CreateGame
export interface CreateGameRequest {
  format: GameFormat;
  gameName: string;
  playerName: string;
  decklist: DecklistEntry[];
}

export interface CreateGameResponse {
  gameId: string;
  playerId: string;
}

// JoinGame
export interface JoinGameRequest {
  gameId: string;
  playerName: string;
  decklist: DecklistEntry[];
}

export interface JoinGameResponse {
  playerId: string;
}

// SetReady
export interface SetReadyRequest {
  gameId: string;
  playerId: string;
  ready: boolean;
}

export interface SetReadyResponse {
  gameId: string;
  allReady: boolean;
  status: GameStatus;
}

// GetGameState
export interface GetGameStateRequest {
  gameId: string;
  perspectivePlayerId?: string;
}

export interface CounterInfo {
  counterType: string;
  count: number;
}

export interface PermanentInfo {
  objectId: number;
  name: string;
  oracleId?: string;
  controller: string;
  owner: string;
  cardTypes: string[];
  subtypes: string[];
  power?: number;
  toughness?: number;
  effectivePower?: number;
  effectiveToughness?: number;
  tapped: boolean;
  summoningSick: boolean;
  damageMarked: number;
  counters: CounterInfo[];
  keywords: string[];
}

export interface CardInfo {
  objectId: number;
  name: string;
  oracleId: string;
  cardTypes: string[];
  manaCost?: string[];
  manaValue: number;
}

export interface PlayerZoneEntry {
  playerId: string;
  cards: CardInfo[];
}

export interface StackEntryInfo {
  name: string;
  controller: string;
  objectId?: number;
  oracleId?: string;
  abilityText?: string;
  targets?: SpellTarget[];
}

export interface GetGameStateResponse {
  gameId: string;
  status: GameStatus;
  players: PlayerInfo[];
  turnNumber: number;
  actionCount: number;
  phase?: GamePhase;
  landsPlayedThisTurn?: number;
  priorityPlayerId?: string;
  activePlayerId?: string;
  playOrderChooserId?: string;
  battlefield?: PermanentInfo[];
  hand?: CardInfo[];
  graveyards?: PlayerZoneEntry[];
  exile?: CardInfo[];
  command?: CardInfo[];
  stack?: StackEntryInfo[];
  combat?: CombatInfo;
}

export interface CombatInfo {
  attackers: CombatAttackerInfo[];
  blockers: CombatBlockerInfo[];
}

export interface CombatAttackerInfo {
  objectId: number;
  targetPlayerId: string;
  name?: string;
}

export interface CombatBlockerInfo {
  objectId: number;
  blockingId: number;
}

// SubmitAction
export interface SubmitActionRequest {
  gameId: string;
  playerId: string;
  action: ActionInput;
  holdPriority?: boolean;
}

export interface SubmitActionResponse {
  gameId: string;
  actionCount: number;
  status: GameStatus;
}

// GetLegalActions
export interface GetLegalActionsRequest {
  gameId: string;
  playerId: string;
}

export interface GetLegalActionsResponse {
  gameId: string;
  actions: LegalAction[];
}

// Ping
export interface PingResponse {
  status: string;
}

export interface ListGamesRequest {
  status?: GameStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListGamesResponse {
  games: GameSummaryResponse[];
}

export interface GameSummaryResponse {
  gameId: string;
  name: string;
  status: GameStatus;
  playerCount: number;
  format: GameFormat;
}

export interface LeaveGameRequest {
  gameId: string;
  playerId: string;
}

export interface LeaveGameResponse {
  gameId: string;
  playersRemaining: number;
}
