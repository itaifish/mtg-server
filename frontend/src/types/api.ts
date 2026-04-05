import type { GameFormat, GameStatus } from './enums';
import type { ActionInput } from './actions';
import type { DecklistEntry, LegalAction, PlayerInfo } from './models';

// CreateGame
export interface CreateGameRequest {
  format: GameFormat;
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

export interface GetGameStateResponse {
  gameId: string;
  status: GameStatus;
  players: PlayerInfo[];
  turnNumber: number;
  actionCount: number;
  priorityPlayerId?: string;
  activePlayerId?: string;
  playOrderChooserId?: string;
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
}

export interface ListGamesResponse {
  games: GameSummaryResponse[];
}

export interface GameSummaryResponse {
  gameId: string;
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
