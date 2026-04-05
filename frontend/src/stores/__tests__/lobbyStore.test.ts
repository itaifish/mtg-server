import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLobbyStore } from '../lobbyStore';
import type { MtgApiClient } from '../../api/client';
import { GameFormat } from '../../types/enums';
import type { DecklistEntry } from '../../types/models';

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

const decklist: DecklistEntry[] = [{ cardName: 'Forest', count: 60 }];

describe('lobbyStore', () => {
  beforeEach(() => {
    useLobbyStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = useLobbyStore.getState();
    expect(state.gameId).toBeNull();
    expect(state.playerId).toBeNull();
    expect(state.playerName).toBe('');
    expect(state.games).toEqual([]);
    expect(state.isCreating).toBe(false);
    expect(state.isJoining).toBe(false);
    expect(state.error).toBeNull();
  });

  describe('createGame', () => {
    it('sets gameId and playerId on success', async () => {
      const client = mockClient({
        createGame: vi.fn().mockResolvedValue({ gameId: 'g1', playerId: 'p1' }),
      });
      await useLobbyStore.getState().createGame(client, GameFormat.STANDARD, 'Test Game', 'Alice', decklist);
      const state = useLobbyStore.getState();
      expect(state.gameId).toBe('g1');
      expect(state.playerId).toBe('p1');
      expect(state.playerName).toBe('Alice');
      expect(state.isCreating).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      const client = mockClient({
        createGame: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      await useLobbyStore.getState().createGame(client, GameFormat.STANDARD, 'Test Game', 'Alice', decklist);
      const state = useLobbyStore.getState();
      expect(state.isCreating).toBe(false);
      expect(state.error).toBe('Network error');
      expect(state.gameId).toBeNull();
    });

    it('sets fallback error for non-Error throws', async () => {
      const client = mockClient({
        createGame: vi.fn().mockRejectedValue('string error'),
      });
      await useLobbyStore.getState().createGame(client, GameFormat.STANDARD, 'Test Game', 'Alice', decklist);
      expect(useLobbyStore.getState().error).toBe('Failed to create game');
    });
  });

  describe('joinGame', () => {
    it('sets playerId and gameId on success', async () => {
      const client = mockClient({
        joinGame: vi.fn().mockResolvedValue({ playerId: 'p2' }),
      });
      await useLobbyStore.getState().joinGame(client, 'g1', 'Bob', decklist);
      const state = useLobbyStore.getState();
      expect(state.gameId).toBe('g1');
      expect(state.playerId).toBe('p2');
      expect(state.playerName).toBe('Bob');
      expect(state.isJoining).toBe(false);
    });

    it('sets error on failure', async () => {
      const client = mockClient({
        joinGame: vi.fn().mockRejectedValue(new Error('Game full')),
      });
      await useLobbyStore.getState().joinGame(client, 'g1', 'Bob', decklist);
      expect(useLobbyStore.getState().error).toBe('Game full');
      expect(useLobbyStore.getState().isJoining).toBe(false);
    });

    it('sets fallback error for non-Error throws', async () => {
      const client = mockClient({
        joinGame: vi.fn().mockRejectedValue(42),
      });
      await useLobbyStore.getState().joinGame(client, 'g1', 'Bob', decklist);
      expect(useLobbyStore.getState().error).toBe('Failed to join game');
    });
  });

  describe('setReady', () => {
    it('calls client.setReady with current gameId/playerId', async () => {
      const setReadyFn = vi.fn().mockResolvedValue({ gameId: 'g1', allReady: true, status: 'IN_PROGRESS' });
      const client = mockClient({ setReady: setReadyFn });
      useLobbyStore.setState({ gameId: 'g1', playerId: 'p1' });
      await useLobbyStore.getState().setReady(client, true);
      expect(setReadyFn).toHaveBeenCalledWith({ gameId: 'g1', playerId: 'p1', ready: true });
    });

    it('does nothing if gameId is null', async () => {
      const setReadyFn = vi.fn();
      const client = mockClient({ setReady: setReadyFn });
      await useLobbyStore.getState().setReady(client, true);
      expect(setReadyFn).not.toHaveBeenCalled();
    });

    it('does nothing if playerId is null', async () => {
      const setReadyFn = vi.fn();
      const client = mockClient({ setReady: setReadyFn });
      useLobbyStore.setState({ gameId: 'g1', playerId: null });
      await useLobbyStore.getState().setReady(client, true);
      expect(setReadyFn).not.toHaveBeenCalled();
    });

    it('sets error on failure', async () => {
      const client = mockClient({
        setReady: vi.fn().mockRejectedValue(new Error('Server down')),
      });
      useLobbyStore.setState({ gameId: 'g1', playerId: 'p1' });
      await useLobbyStore.getState().setReady(client, true);
      expect(useLobbyStore.getState().error).toBe('Server down');
    });

    it('sets fallback error for non-Error throws', async () => {
      const client = mockClient({
        setReady: vi.fn().mockRejectedValue(null),
      });
      useLobbyStore.setState({ gameId: 'g1', playerId: 'p1' });
      await useLobbyStore.getState().setReady(client, true);
      expect(useLobbyStore.getState().error).toBe('Failed to set ready');
    });
  });

  it('setPlayerName updates name', () => {
    useLobbyStore.getState().setPlayerName('Charlie');
    expect(useLobbyStore.getState().playerName).toBe('Charlie');
  });

  it('reset clears all state', () => {
    useLobbyStore.setState({ gameId: 'g1', playerId: 'p1', playerName: 'X', error: 'err' });
    useLobbyStore.getState().reset();
    const state = useLobbyStore.getState();
    expect(state.gameId).toBeNull();
    expect(state.playerId).toBeNull();
    expect(state.playerName).toBe('');
    expect(state.error).toBeNull();
  });

  it('clearError clears error', () => {
    useLobbyStore.setState({ error: 'some error' });
    useLobbyStore.getState().clearError();
    expect(useLobbyStore.getState().error).toBeNull();
  });
});
