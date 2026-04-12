import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChoicePanel } from '../ChoicePanel';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { GameStatus } from '@/types/enums';

const mockMakeChoice = vi.fn();

vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({
    makeChoice: mockMakeChoice,
    isLoading: false,
  }),
}));

vi.mock('@/api/hooks', () => ({ useApiClient: () => ({}) }));

const players = [
  { playerId: 'p1', name: 'Alice', lifeTotal: 20, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0, mulliganCount: 0, hasKept: false },
  { playerId: 'p2', name: 'Bob', lifeTotal: 20, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0, mulliganCount: 0, hasKept: false },
];

describe('ChoicePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().reset();
    useLobbyStore.setState({ gameId: 'g1', playerId: 'p1' });
    useGameStore.setState({
      gameState: {
        gameId: 'g1', status: GameStatus.IN_PROGRESS, players,
        turnNumber: 1, actionCount: 0, priorityPlayerId: 'p1', activePlayerId: 'p1',
      },
    });
  });

  it('renders nothing when no pending choice', () => {
    const { container } = render(<ChoicePanel />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when choice is for another player', () => {
    useGameStore.setState({
      gameState: {
        gameId: 'g1', status: GameStatus.IN_PROGRESS, players,
        turnNumber: 1, actionCount: 0, priorityPlayerId: 'p2', activePlayerId: 'p2',
        pendingChoice: { playerId: 'p2', prompt: 'Pay 2 life?', choiceType: 'YES_NO' },
      },
    });
    const { container } = render(<ChoicePanel />);
    expect(container.innerHTML).toBe('');
  });

  it('renders yes/no choice with prompt', () => {
    useGameStore.setState({
      gameState: {
        gameId: 'g1', status: GameStatus.IN_PROGRESS, players,
        turnNumber: 1, actionCount: 0, priorityPlayerId: 'p1', activePlayerId: 'p1',
        pendingChoice: { playerId: 'p1', prompt: 'Pay 2 life?', choiceType: 'YES_NO' },
      },
    });
    render(<ChoicePanel />);
    expect(screen.getByText('Pay 2 life?')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('calls makeChoice(true) on Yes click', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      gameState: {
        gameId: 'g1', status: GameStatus.IN_PROGRESS, players,
        turnNumber: 1, actionCount: 0, priorityPlayerId: 'p1', activePlayerId: 'p1',
        pendingChoice: { playerId: 'p1', prompt: 'Pay 2 life?', choiceType: 'YES_NO' },
      },
    });
    render(<ChoicePanel />);
    await user.click(screen.getByText('Yes'));
    expect(mockMakeChoice).toHaveBeenCalledWith(true);
  });

  it('calls makeChoice(false) on No click', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      gameState: {
        gameId: 'g1', status: GameStatus.IN_PROGRESS, players,
        turnNumber: 1, actionCount: 0, priorityPlayerId: 'p1', activePlayerId: 'p1',
        pendingChoice: { playerId: 'p1', prompt: 'Pay 2 life?', choiceType: 'YES_NO' },
      },
    });
    render(<ChoicePanel />);
    await user.click(screen.getByText('No'));
    expect(mockMakeChoice).toHaveBeenCalledWith(false);
  });
});
