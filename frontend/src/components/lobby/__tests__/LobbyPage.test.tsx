import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LobbyPage } from '../LobbyPage';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useGameStore } from '@/stores/gameStore';
import { GameStatus } from '@/types/enums';

vi.mock('@/api/hooks', () => ({ useApiClient: () => ({}) }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('LobbyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useLobbyStore.getState().reset();
    useGameStore.getState().reset();
    useGameStore.setState({ fetchGameState: vi.fn() });
  });

  it('renders lobby with create form and game list', () => {
    render(<MemoryRouter><LobbyPage /></MemoryRouter>);
    expect(screen.getByText('MTG Arena Lobby')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create Game' })).toBeInTheDocument();
    expect(screen.getByText('Available Games')).toBeInTheDocument();
  });

  it('shows error banner', () => {
    useLobbyStore.setState({ error: 'Network error' });
    render(<MemoryRouter><LobbyPage /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });

  it('renders WaitingRoom when gameId is set', () => {
    useLobbyStore.setState({ gameId: 'g1', playerId: 'p1' });
    useGameStore.setState({
      gameState: {
        gameId: 'g1', status: GameStatus.WAITING_FOR_PLAYERS,
        players: [{ playerId: 'p1', name: 'Alice', lifeTotal: 20, ready: false }],
        turnNumber: 0, actionCount: 0,
      },
    });
    render(<MemoryRouter><LobbyPage /></MemoryRouter>);
    expect(screen.getByText('Waiting Room')).toBeInTheDocument();
  });

  it('opens JoinGameDialog when Join clicked', async () => {
    const user = userEvent.setup();
    useLobbyStore.setState({
      games: [{ gameId: 'g1', format: 'STANDARD', playerCount: 1, status: 'WAITING_FOR_PLAYERS' }],
    });
    render(<MemoryRouter><LobbyPage /></MemoryRouter>);
    await user.click(screen.getByText('Join'));
    expect(screen.getByRole('dialog', { name: /join game/i })).toBeInTheDocument();
  });

  it('closes JoinGameDialog when close button clicked', async () => {
    const user = userEvent.setup();
    useLobbyStore.setState({
      games: [{ gameId: 'g1', format: 'STANDARD', playerCount: 1, status: 'WAITING_FOR_PLAYERS' }],
    });
    render(<MemoryRouter><LobbyPage /></MemoryRouter>);
    await user.click(screen.getByText('Join'));
    expect(screen.getByRole('dialog', { name: /join game/i })).toBeInTheDocument();
    await user.click(screen.getByLabelText('Close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
