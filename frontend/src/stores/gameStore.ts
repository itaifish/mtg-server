import { create } from 'zustand';
import type { MtgApiClient } from '../api/client';
import type { ActionInput } from '../types/actions';
import type { GetGameStateResponse } from '../types/api';
import type { LegalAction, PlayerInfo } from '../types/models';

export interface GameState {
  gameState: GetGameStateResponse | null;
  legalActions: LegalAction[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  pollingInterval: number | null;
}

export interface GameActions {
  fetchGameState: (
    client: MtgApiClient,
    gameId: string,
    perspectivePlayerId?: string,
  ) => Promise<void>;
  fetchLegalActions: (
    client: MtgApiClient,
    gameId: string,
    playerId: string,
  ) => Promise<void>;
  submitAction: (
    client: MtgApiClient,
    gameId: string,
    playerId: string,
    action: ActionInput,
    holdPriority?: boolean,
  ) => Promise<void>;
  startPolling: (
    client: MtgApiClient,
    gameId: string,
    playerId: string,
    intervalMs: number,
  ) => void;
  stopPolling: () => void;
  reset: () => void;
  clearError: () => void;
}

// Selectors
export const selectCurrentPhase = (state: GameState): string | undefined =>
  state.gameState?.status;

export const selectIsMyTurn = (state: GameState, playerId: string): boolean =>
  state.gameState?.priorityPlayerId === playerId;

export const selectMyPlayer = (
  state: GameState,
  playerId: string,
): PlayerInfo | undefined =>
  state.gameState?.players.find((p) => p.playerId === playerId);

export const selectOpponentPlayers = (
  state: GameState,
  playerId: string,
): PlayerInfo[] =>
  state.gameState?.players.filter((p) => p.playerId !== playerId) ?? [];

const initialState: GameState = {
  gameState: null,
  legalActions: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
  pollingInterval: null,
};

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  ...initialState,

  fetchGameState: async (client, gameId, perspectivePlayerId?) => {
    set({ isLoading: true, error: null });
    try {
      const gameState = await client.getGameState({ gameId, perspectivePlayerId });
      set({ gameState, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to fetch game state' });
    }
  },

  fetchLegalActions: async (client, gameId, playerId) => {
    try {
      const res = await client.getLegalActions({ gameId, playerId });
      set({ legalActions: res.actions });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch legal actions' });
    }
  },

  submitAction: async (client, gameId, playerId, action, holdPriority?) => {
    set({ isSubmitting: true, error: null });
    try {
      await client.submitAction({ gameId, playerId, action, holdPriority });
      set({ isSubmitting: false });
      // Refresh state after action
      const gameState = await client.getGameState({ gameId, perspectivePlayerId: playerId });
      const legalRes = await client.getLegalActions({ gameId, playerId });
      set({ gameState, legalActions: legalRes.actions });
    } catch (e) {
      set({ isSubmitting: false, error: e instanceof Error ? e.message : 'Failed to submit action' });
    }
  },

  startPolling: (client, gameId, playerId, intervalMs) => {
    const { stopPolling, fetchGameState, fetchLegalActions } = get();
    stopPolling();
    const id = window.setInterval(() => {
      fetchGameState(client, gameId, playerId);
      fetchLegalActions(client, gameId, playerId);
    }, intervalMs);
    set({ pollingInterval: id });
  },

  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval !== null) {
      window.clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  reset: () => {
    get().stopPolling();
    set(initialState);
  },

  clearError: () => set({ error: null }),
}));
