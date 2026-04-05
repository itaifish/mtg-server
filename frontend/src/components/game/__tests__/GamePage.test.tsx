import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../GamePage';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { GameStatus, LegalActionType } from '@/types/enums';
import type { GetGameStateResponse } from '@/types/api';

const mockConcede = vi.fn();

vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({
    concede: mockConcede,
    declareAttackers: vi.fn(),
    declareBlockers: vi.fn(),
    activateManaAbility: vi.fn(),
    castSpell: vi.fn(),
    passPriority: vi.fn(),
    playLand: vi.fn(),
    chooseFirstPlayer: vi.fn(),
    keepHand: vi.fn(),
    mulligan: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/api/hooks', () => ({ useApiClient: () => ({}) }));

vi.mock('@/theme', async () => {
  const { defaultTheme } = await import('@/theme/defaultTheme');
  return {
    useTheme: () => ({ theme: defaultTheme, setTheme: vi.fn(), availableThemes: [defaultTheme] }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    defaultTheme,
  };
});

// Mock selectOpponentPlayers to return stable reference
const stableOpponents = [{ playerId: 'p2', name: 'Bob', lifeTotal: 20, ready: true }];
vi.mock('@/stores/gameStore', async () => {
  const actual = await vi.importActual<typeof import('@/stores/gameStore')>('@/stores/gameStore');
  return {
    ...actual,
    selectOpponentPlayers: () => stableOpponents,
  };
});

const baseState: GetGameStateResponse = {
  gameId: 'g1',
  status: GameStatus.IN_PROGRESS,
  players: [
    { playerId: 'p1', name: 'Alice', lifeTotal: 20, ready: true },
    { playerId: 'p2', name: 'Bob', lifeTotal: 20, ready: true },
  ],
  turnNumber: 1,
  actionCount: 0,
  priorityPlayerId: 'p1',
  activePlayerId: 'p1',
};

function renderGamePage() {
  return render(
    <MemoryRouter initialEntries={['/game/g1']}>
      <Routes>
        <Route path="/game/:gameId" element={<GamePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().reset();
    useLobbyStore.setState({ gameId: 'g1', playerId: 'p1' });
    // Mock polling to prevent infinite re-render loops
    useGameStore.setState({
      startPolling: vi.fn(),
      stopPolling: vi.fn(),
      submitAction: vi.fn(),
    });
  });

  it('shows loading spinner when no game state', () => {
    useGameStore.setState({ gameState: null });
    renderGamePage();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('renders game board and action bar when in progress', () => {
    useGameStore.setState({ gameState: baseState, legalActions: [] });
    renderGamePage();
    expect(screen.getByRole('toolbar', { name: /game actions/i })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /current phase/i })).toBeInTheDocument();
  });

  it('shows error banner when error exists', () => {
    useGameStore.setState({ gameState: baseState, legalActions: [], error: 'Something broke' });
    renderGamePage();
    expect(screen.getByRole('alert')).toHaveTextContent('Something broke');
  });

  it('shows pregame panel during CHOOSING_PLAY_ORDER', () => {
    useGameStore.setState({
      gameState: { ...baseState, status: GameStatus.CHOOSING_PLAY_ORDER, playOrderChooserId: 'p1' },
      legalActions: [],
    });
    renderGamePage();
    expect(screen.getByRole('region', { name: /choose play order/i })).toBeInTheDocument();
  });

  it('shows combat panel when combat actions available', () => {
    useGameStore.setState({
      gameState: baseState,
      legalActions: [{ actionType: LegalActionType.DECLARE_ATTACKERS, objectId: 10 }],
    });
    renderGamePage();
    expect(screen.getByRole('region', { name: /declare attackers/i })).toBeInTheDocument();
  });

  it('shows game over overlay when FINISHED', () => {
    useGameStore.setState({
      gameState: { ...baseState, status: 'FINISHED' as GameStatus },
      legalActions: [],
    });
    renderGamePage();
    expect(screen.getByText('Game Over')).toBeInTheDocument();
  });

  it('calls submitAction when an action button is clicked', async () => {
    const submitAction = vi.fn();
    useGameStore.setState({
      gameState: { ...baseState, priorityPlayerId: 'p1' },
      legalActions: [{ actionType: LegalActionType.PASS_PRIORITY }],
      submitAction,
    });
    renderGamePage();
    const user = (await import('@testing-library/user-event')).default.setup();
    await user.click(screen.getByText('Pass Priority'));
    expect(submitAction).toHaveBeenCalledWith(expect.anything(), 'g1', 'p1', { passPriority: {} });
  });
});
