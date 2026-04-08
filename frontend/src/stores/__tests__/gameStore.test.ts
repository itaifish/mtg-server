import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useGameStore,
  selectCurrentPhase,
  selectIsMyTurn,
  selectMyPlayer,
  selectOpponentPlayers,
} from '../gameStore';
import type { MtgApiClient } from '../../api/client';
import type { GetGameStateResponse } from '../../types/api';
import { GameStatus, LegalActionType } from '../../types/enums';
import { createPassPriority } from '../../types/actions';

function mockClient(overrides: Partial<MtgApiClient> = {}): MtgApiClient {
  return {
    ping: vi.fn(),
    createGame: vi.fn(),
    joinGame: vi.fn(),
    setReady: vi.fn(),
    getGameState: vi.fn(),
    submitAction: vi.fn(),
    getLegalActions: vi.fn(),
    ...overrides,
  } as unknown as MtgApiClient;
}

const gameStateResponse: GetGameStateResponse = {
  gameId: 'g1',
  status: GameStatus.IN_PROGRESS,
  players: [
    { playerId: 'p1', name: 'Alice', lifeTotal: 20, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0, mulliganCount: 0, hasKept: false },
    { playerId: 'p2', name: 'Bob', lifeTotal: 20, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0, mulliganCount: 0, hasKept: false },
  ],
  turnNumber: 1,
  actionCount: 5,
  priorityPlayerId: 'p1',
  activePlayerId: 'p1',
};

describe('gameStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.getState().reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has correct initial state', () => {
    const state = useGameStore.getState();
    expect(state.gameState).toBeNull();
    expect(state.legalActions).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isSubmitting).toBe(false);
    expect(state.error).toBeNull();
    expect(state.pollingInterval).toBeNull();
  });

  describe('fetchGameState', () => {
    it('fetches and sets game state', async () => {
      const client = mockClient({
        getGameState: vi.fn().mockResolvedValue(gameStateResponse),
      });
      await useGameStore.getState().fetchGameState(client, 'g1', 'p1');
      const state = useGameStore.getState();
      expect(state.gameState).toEqual(gameStateResponse);
      expect(state.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      const client = mockClient({
        getGameState: vi.fn().mockRejectedValue(new Error('Not found')),
      });
      await useGameStore.getState().fetchGameState(client, 'g1');
      expect(useGameStore.getState().error).toBe('Not found');
      expect(useGameStore.getState().isLoading).toBe(false);
    });

    it('sets fallback error for non-Error throws', async () => {
      const client = mockClient({
        getGameState: vi.fn().mockRejectedValue(undefined),
      });
      await useGameStore.getState().fetchGameState(client, 'g1');
      expect(useGameStore.getState().error).toBe('Failed to fetch game state');
    });
  });

  describe('fetchLegalActions', () => {
    it('fetches and sets legal actions', async () => {
      const actions = [{ actionType: LegalActionType.PASS_PRIORITY }];
      const client = mockClient({
        getLegalActions: vi.fn().mockResolvedValue({ gameId: 'g1', actions }),
      });
      await useGameStore.getState().fetchLegalActions(client, 'g1', 'p1');
      expect(useGameStore.getState().legalActions).toEqual(actions);
    });

    it('sets error on failure', async () => {
      const client = mockClient({
        getLegalActions: vi.fn().mockRejectedValue(new Error('Forbidden')),
      });
      await useGameStore.getState().fetchLegalActions(client, 'g1', 'p1');
      expect(useGameStore.getState().error).toBe('Forbidden');
    });

    it('sets fallback error for non-Error throws', async () => {
      const client = mockClient({
        getLegalActions: vi.fn().mockRejectedValue(0),
      });
      await useGameStore.getState().fetchLegalActions(client, 'g1', 'p1');
      expect(useGameStore.getState().error).toBe('Failed to fetch legal actions');
    });
  });

  describe('submitAction', () => {
    it('submits action and refreshes state', async () => {
      const actions = [{ actionType: LegalActionType.PLAY_LAND, objectId: 1 }];
      const client = mockClient({
        submitAction: vi.fn().mockResolvedValue({ gameId: 'g1', actionCount: 6, status: GameStatus.IN_PROGRESS }),
        getGameState: vi.fn().mockResolvedValue(gameStateResponse),
        getLegalActions: vi.fn().mockResolvedValue({ gameId: 'g1', actions }),
      });
      await useGameStore.getState().submitAction(client, 'g1', 'p1', createPassPriority());
      const state = useGameStore.getState();
      expect(state.isSubmitting).toBe(false);
      expect(state.gameState).toEqual(gameStateResponse);
      expect(state.legalActions).toEqual(actions);
    });

    it('passes holdPriority to client', async () => {
      const submitFn = vi.fn().mockResolvedValue({ gameId: 'g1', actionCount: 6, status: GameStatus.IN_PROGRESS });
      const client = mockClient({
        submitAction: submitFn,
        getGameState: vi.fn().mockResolvedValue(gameStateResponse),
        getLegalActions: vi.fn().mockResolvedValue({ gameId: 'g1', actions: [] }),
      });
      await useGameStore.getState().submitAction(client, 'g1', 'p1', createPassPriority(), true);
      expect(submitFn).toHaveBeenCalledWith({
        gameId: 'g1',
        playerId: 'p1',
        action: { passPriority: {} },
        holdPriority: true,
      });
    });

    it('sets error on failure', async () => {
      const client = mockClient({
        submitAction: vi.fn().mockRejectedValue(new Error('Illegal action')),
      });
      await useGameStore.getState().submitAction(client, 'g1', 'p1', createPassPriority());
      expect(useGameStore.getState().error).toBe('Illegal action');
      expect(useGameStore.getState().isSubmitting).toBe(false);
    });

    it('sets fallback error for non-Error throws', async () => {
      const client = mockClient({
        submitAction: vi.fn().mockRejectedValue(false),
      });
      await useGameStore.getState().submitAction(client, 'g1', 'p1', createPassPriority());
      expect(useGameStore.getState().error).toBe('Failed to submit action');
    });
  });

  describe('polling', () => {
    it('starts and stops polling', async () => {
      const getGameState = vi.fn().mockResolvedValue(gameStateResponse);
      const getLegalActions = vi.fn().mockResolvedValue({ gameId: 'g1', actions: [] });
      const client = mockClient({ getGameState, getLegalActions });
      const flush = () => Promise.resolve().then(() => Promise.resolve());

      useGameStore.getState().startPolling(client, 'g1', 'p1', 1000);
      expect(useGameStore.getState().pollingInterval).not.toBeNull();

      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(1000);
        await flush();
      }
      expect(getGameState).toHaveBeenCalledTimes(3);
      expect(getLegalActions).toHaveBeenCalledTimes(3);

      useGameStore.getState().stopPolling();
      expect(useGameStore.getState().pollingInterval).toBeNull();

      vi.advanceTimersByTime(2000);
      await flush();
      expect(getGameState).toHaveBeenCalledTimes(3);
    });

    it('clears previous polling when starting new one', () => {
      const client = mockClient({
        getGameState: vi.fn().mockResolvedValue(gameStateResponse),
        getLegalActions: vi.fn().mockResolvedValue({ gameId: 'g1', actions: [] }),
      });
      useGameStore.getState().startPolling(client, 'g1', 'p1', 1000);
      const firstId = useGameStore.getState().pollingInterval;
      useGameStore.getState().startPolling(client, 'g1', 'p1', 2000);
      expect(useGameStore.getState().pollingInterval).not.toBe(firstId);
    });

    it('stopPolling is no-op when not polling', () => {
      useGameStore.getState().stopPolling();
      expect(useGameStore.getState().pollingInterval).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears state and stops polling', () => {
      const client = mockClient({
        getGameState: vi.fn().mockResolvedValue(gameStateResponse),
        getLegalActions: vi.fn().mockResolvedValue({ gameId: 'g1', actions: [] }),
      });
      useGameStore.getState().startPolling(client, 'g1', 'p1', 1000);
      useGameStore.setState({ error: 'err', gameState: gameStateResponse });
      useGameStore.getState().reset();
      const state = useGameStore.getState();
      expect(state.gameState).toBeNull();
      expect(state.pollingInterval).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  it('clearError clears error', () => {
    useGameStore.setState({ error: 'some error' });
    useGameStore.getState().clearError();
    expect(useGameStore.getState().error).toBeNull();
  });

  describe('selectors', () => {
    it('selectCurrentPhase returns status', () => {
      expect(selectCurrentPhase({ ...useGameStore.getState(), gameState: gameStateResponse })).toBe(GameStatus.IN_PROGRESS);
    });

    it('selectCurrentPhase returns undefined when no game state', () => {
      expect(selectCurrentPhase(useGameStore.getState())).toBeUndefined();
    });

    it('selectIsMyTurn returns true when player has priority', () => {
      expect(selectIsMyTurn({ ...useGameStore.getState(), gameState: gameStateResponse }, 'p1')).toBe(true);
    });

    it('selectIsMyTurn returns false for other player', () => {
      expect(selectIsMyTurn({ ...useGameStore.getState(), gameState: gameStateResponse }, 'p2')).toBe(false);
    });

    it('selectIsMyTurn returns false when no game state', () => {
      expect(selectIsMyTurn(useGameStore.getState(), 'p1')).toBe(false);
    });

    it('selectMyPlayer finds the player', () => {
      const player = selectMyPlayer({ ...useGameStore.getState(), gameState: gameStateResponse }, 'p1');
      expect(player?.name).toBe('Alice');
    });

    it('selectMyPlayer returns undefined for unknown player', () => {
      expect(selectMyPlayer({ ...useGameStore.getState(), gameState: gameStateResponse }, 'p99')).toBeUndefined();
    });

    it('selectMyPlayer returns undefined when no game state', () => {
      expect(selectMyPlayer(useGameStore.getState(), 'p1')).toBeUndefined();
    });

    it('selectOpponentPlayers returns other players', () => {
      const opponents = selectOpponentPlayers({ ...useGameStore.getState(), gameState: gameStateResponse }, 'p1');
      expect(opponents).toHaveLength(1);
      expect(opponents[0].name).toBe('Bob');
    });

    it('selectOpponentPlayers returns empty array when no game state', () => {
      expect(selectOpponentPlayers(useGameStore.getState(), 'p1')).toEqual([]);
    });
  });
});
