import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameActions } from '../useGameActions';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import type { MtgApiClient } from '@/api/client';

// Mock the API client context
const mockSubmitAction = vi.fn();
const mockClient: MtgApiClient = {
  ping: vi.fn(),
  createGame: vi.fn(),
  joinGame: vi.fn(),
  setReady: vi.fn(),
  getGameState: vi.fn(),
  submitAction: vi.fn(),
  getLegalActions: vi.fn(),
} as unknown as MtgApiClient;

vi.mock('@/api/hooks', () => ({
  useApiClient: () => mockClient,
}));

function setupStores(gameId: string, playerId: string) {
  useLobbyStore.setState({ gameId, playerId });
  useGameStore.setState({ submitAction: mockSubmitAction });
}

describe('useGameActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubmitAction.mockResolvedValue(undefined);
    useLobbyStore.getState().reset();
    useGameStore.getState().reset();
    setupStores('g1', 'p1');
  });

  it('passPriority submits correct action', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.passPriority());
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', { passPriority: {} });
  });

  it('playLand submits correct action', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.playLand(42));
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', { playLand: { objectId: 42 } });
  });

  it('castSpell submits correct action', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.castSpell(10, [{ paidWith: ['WHITE'] }]));
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', {
      castSpell: { objectId: 10, manaPayment: [{ paidWith: ['WHITE'] }], targets: undefined, modeChoices: undefined },
    });
  });

  it('activateManaAbility submits correct action', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.activateManaAbility(5, 0));
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', {
      activateManaAbility: { objectId: 5, abilityIndex: 0 },
    });
  });

  it('declareAttackers submits correct action', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.declareAttackers([{ objectId: 1, targetPlayerId: 'p2' }]));
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', {
      declareAttackers: { attackers: [{ objectId: 1, targetPlayerId: 'p2' }] },
    });
  });

  it('declareBlockers submits correct action', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.declareBlockers([{ objectId: 2, blockingId: 1 }]));
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', {
      declareBlockers: { blockers: [{ objectId: 2, blockingId: 1 }] },
    });
  });

  it('chooseFirstPlayer submits correct action', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.chooseFirstPlayer('p2'));
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', {
      chooseFirstPlayer: { firstPlayerId: 'p2' },
    });
  });

  it('keepHand submits correct action', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.keepHand([3, 4]));
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', {
      keepHand: { cardsToBottom: [3, 4] },
    });
  });

  it('keepHand without cardsToBottom', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.keepHand());
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', {
      keepHand: { cardsToBottom: undefined },
    });
  });

  it('mulligan submits correct action', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.mulligan());
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', { mulligan: {} });
  });

  it('concede submits correct action', async () => {
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.concede());
    expect(mockSubmitAction).toHaveBeenCalledWith(mockClient, 'g1', 'p1', { concede: {} });
  });

  it('sets error on failure', async () => {
    mockSubmitAction.mockRejectedValueOnce(new Error('Server error'));
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.passPriority());
    expect(result.current.error).toBe('Server error');
  });

  it('sets fallback error for non-Error throws', async () => {
    mockSubmitAction.mockRejectedValueOnce('unknown');
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.passPriority());
    expect(result.current.error).toBe('Action failed');
  });

  it('does nothing when gameId is null', async () => {
    useLobbyStore.setState({ gameId: null });
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.passPriority());
    expect(mockSubmitAction).not.toHaveBeenCalled();
  });

  it('does nothing when playerId is null', async () => {
    useLobbyStore.setState({ playerId: null });
    const { result } = renderHook(() => useGameActions());
    await act(() => result.current.passPriority());
    expect(mockSubmitAction).not.toHaveBeenCalled();
  });
});
