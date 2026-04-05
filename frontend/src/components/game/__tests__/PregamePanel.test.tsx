import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PregamePanel } from '../PregamePanel';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { GameStatus } from '@/types/enums';
import type { GetGameStateResponse } from '@/types/api';

const mockChooseFirstPlayer = vi.fn();
const mockKeepHand = vi.fn();
const mockMulligan = vi.fn();

vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({
    chooseFirstPlayer: mockChooseFirstPlayer,
    keepHand: mockKeepHand,
    mulligan: mockMulligan,
    isLoading: false,
  }),
}));

vi.mock('@/api/hooks', () => ({
  useApiClient: () => ({}),
}));

const basePlayers = [
  { playerId: 'p1', name: 'Alice', lifeTotal: 20, ready: true },
  { playerId: 'p2', name: 'Bob', lifeTotal: 20, ready: true },
];

function setGameState(overrides: Partial<GetGameStateResponse>) {
  useGameStore.setState({
    gameState: {
      gameId: 'g1',
      status: GameStatus.IN_PROGRESS,
      players: basePlayers,
      turnNumber: 1,
      actionCount: 0,
      ...overrides,
    },
  });
}

describe('PregamePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().reset();
    useLobbyStore.setState({ gameId: 'g1', playerId: 'p1' });
  });

  it('renders nothing when status is IN_PROGRESS', () => {
    setGameState({ status: GameStatus.IN_PROGRESS });
    const { container } = render(<PregamePanel />);
    expect(container.innerHTML).toBe('');
  });

  it('renders choose play order UI when chooser', () => {
    setGameState({ status: GameStatus.CHOOSING_PLAY_ORDER, playOrderChooserId: 'p1' });
    render(<PregamePanel />);
    expect(screen.getByRole('region', { name: /choose play order/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bob' })).toBeInTheDocument();
  });

  it('shows waiting message when not chooser', () => {
    setGameState({ status: GameStatus.CHOOSING_PLAY_ORDER, playOrderChooserId: 'p2' });
    render(<PregamePanel />);
    expect(screen.getByText(/waiting for opponent/i)).toBeInTheDocument();
  });

  it('calls chooseFirstPlayer on button click', async () => {
    const user = userEvent.setup();
    setGameState({ status: GameStatus.CHOOSING_PLAY_ORDER, playOrderChooserId: 'p1' });
    render(<PregamePanel />);
    await user.click(screen.getByRole('button', { name: 'Bob' }));
    expect(mockChooseFirstPlayer).toHaveBeenCalledWith('p2');
  });

  it('renders mulligan UI', () => {
    setGameState({ status: GameStatus.MULLIGAN });
    render(<PregamePanel />);
    expect(screen.getByRole('region', { name: /mulligan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mulligan/i })).toBeInTheDocument();
  });

  it('calls keepHand on Keep click', async () => {
    const user = userEvent.setup();
    setGameState({ status: GameStatus.MULLIGAN });
    render(<PregamePanel />);
    await user.click(screen.getByRole('button', { name: /keep/i }));
    expect(mockKeepHand).toHaveBeenCalled();
  });

  it('calls mulligan on Mulligan click', async () => {
    const user = userEvent.setup();
    setGameState({ status: GameStatus.MULLIGAN });
    render(<PregamePanel />);
    await user.click(screen.getByRole('button', { name: /mulligan/i }));
    expect(mockMulligan).toHaveBeenCalled();
  });

  it('renders nothing when no game state', () => {
    useGameStore.setState({ gameState: null });
    const { container } = render(<PregamePanel />);
    expect(container.innerHTML).toBe('');
  });
});
