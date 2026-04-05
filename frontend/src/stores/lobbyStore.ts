import { create } from 'zustand';
import type { MtgApiClient } from '../api/client';
import type { GameFormat, GameStatus } from '../types/enums';
import type { DecklistEntry } from '../types/models';

export interface GameSummary {
  gameId: string;
  format: GameFormat;
  playerCount: number;
  status: GameStatus;
}

export interface LobbyState {
  gameId: string | null;
  playerId: string | null;
  playerName: string;
  games: GameSummary[];
  isCreating: boolean;
  isJoining: boolean;
  error: string | null;
}

export interface LobbyActions {
  fetchGames: (client: MtgApiClient) => Promise<void>;
  createGame: (
    client: MtgApiClient,
    format: GameFormat,
    playerName: string,
    decklist: DecklistEntry[],
  ) => Promise<void>;
  joinGame: (
    client: MtgApiClient,
    gameId: string,
    playerName: string,
    decklist: DecklistEntry[],
  ) => Promise<void>;
  leaveGame: (client: MtgApiClient) => Promise<void>;
  setReady: (client: MtgApiClient, ready: boolean) => Promise<void>;
  setPlayerName: (name: string) => void;
  reset: () => void;
  clearError: () => void;
}

const initialState: LobbyState = {
  gameId: null,
  playerId: null,
  playerName: '',
  games: [],
  isCreating: false,
  isJoining: false,
  error: null,
};

export const useLobbyStore = create<LobbyState & LobbyActions>()((set, get) => ({
  ...initialState,

  fetchGames: async (client) => {
    try {
      const res = await client.listGames();
      set({ games: res.games });
    } catch {
      // Silently fail — polling will retry
    }
  },

  createGame: async (client, format, playerName, decklist) => {
    set({ isCreating: true, error: null });
    try {
      const res = await client.createGame({ format, playerName, decklist });
      set({ gameId: res.gameId, playerId: res.playerId, playerName, isCreating: false });
    } catch (e) {
      set({ isCreating: false, error: e instanceof Error ? e.message : 'Failed to create game' });
    }
  },

  joinGame: async (client, gameId, playerName, decklist) => {
    set({ isJoining: true, error: null });
    try {
      const res = await client.joinGame({ gameId, playerName, decklist });
      set({ gameId, playerId: res.playerId, playerName, isJoining: false });
    } catch (e) {
      set({ isJoining: false, error: e instanceof Error ? e.message : 'Failed to join game' });
    }
  },

  leaveGame: async (client) => {
    const { gameId, playerId } = get();
    if (!gameId || !playerId) return;
    try {
      await client.leaveGame({ gameId, playerId });
      set({ gameId: null, playerId: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to leave game' });
    }
  },

  setReady: async (client, ready) => {
    const { gameId, playerId } = get();
    if (!gameId || !playerId) return;
    try {
      await client.setReady({ gameId, playerId, ready });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to set ready' });
    }
  },

  setPlayerName: (name) => set({ playerName: name }),
  reset: () => set(initialState),
  clearError: () => set({ error: null }),
}));
