import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WaitingRoom } from '../WaitingRoom';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useGameStore } from '@/stores/gameStore';
import { GameStatus } from '@/types/enums';

vi.mock('@/api/hooks', () => ({ useApiClient: () => ({}) }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('WaitingRoom', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useLobbyStore.getState().reset();
    useGameStore.getState().reset();
  });

  afterEach(() => { vi.useRealTimers(); });

  it('renders nothing when no gameId', () => {
    useLobbyStore.setState({ gameId: null });
    const { container } = render(<MemoryRouter><WaitingRoom /></MemoryRouter>);
    expect(container.innerHTML).toBe('');
  });

  it('shows loading spinner when no game state', () => {
    useLobbyStore.setState({ gameId: 'g1', playerId: 'p1' });
    render(<MemoryRouter><WaitingRoom /></MemoryRouter>);
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('shows player list when game state loaded', () => {
    useLobbyStore.setState({ gameId: 'g1', playerId: 'p1' });
    useGameStore.setState({
      gameState: {
        gameId: 'g1', status: GameStatus.WAITING_FOR_PLAYERS,
        players: [
          { playerId: 'p1', name: 'Alice', lifeTotal: 20, ready: true },
          { playerId: 'p2', name: 'Bob', lifeTotal: 20, ready: false },
        ],
        turnNumber: 0, actionCount: 0,
      },
    });
    render(<MemoryRouter><WaitingRoom /></MemoryRouter>);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('✓ Ready')).toBeInTheDocument();
    expect(screen.getByText('Not Ready')).toBeInTheDocument();
  });

  it('shows error banner', () => {
    useLobbyStore.setState({ gameId: 'g1', error: 'Connection failed' });
    render(<MemoryRouter><WaitingRoom /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Connection failed');
  });

  it('navigates when game starts', () => {
    useLobbyStore.setState({ gameId: 'g1', playerId: 'p1' });
    useGameStore.setState({
      gameState: {
        gameId: 'g1', status: GameStatus.IN_PROGRESS,
        players: [], turnNumber: 1, actionCount: 0,
      },
    });
    render(<MemoryRouter><WaitingRoom /></MemoryRouter>);
    expect(mockNavigate).toHaveBeenCalledWith('/game/g1');
  });

  it('has Ready button', () => {
    const setReady = vi.fn();
    useGameStore.setState({ fetchGameState: vi.fn() });
    useLobbyStore.setState({ gameId: 'g1', playerId: 'p1', setReady });
    render(<MemoryRouter><WaitingRoom /></MemoryRouter>);
    const btn = screen.getByText('Ready');
    fireEvent.click(btn);
    expect(setReady).toHaveBeenCalledWith(expect.anything(), true);
  });
});
