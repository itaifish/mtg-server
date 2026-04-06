import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CombatPanel } from '../CombatPanel';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { LegalActionType, GameStatus } from '@/types/enums';
import type { PlayerInfo } from '@/types/models';

const mockDeclareAttackers = vi.fn();
const mockDeclareBlockers = vi.fn();

vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({
    declareAttackers: mockDeclareAttackers,
    declareBlockers: mockDeclareBlockers,
    isLoading: false,
  }),
}));

vi.mock('@/api/hooks', () => ({ useApiClient: () => ({}) }));

const players: PlayerInfo[] = [
  { playerId: 'p1', name: 'Alice', lifeTotal: 20, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0 },
  { playerId: 'p2', name: 'Bob', lifeTotal: 20, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0 },
];

// Mock selectOpponentPlayers to return a stable reference
const stableOpponents = [players[1]];
vi.mock('@/stores/gameStore', async () => {
  const actual = await vi.importActual<typeof import('@/stores/gameStore')>('@/stores/gameStore');
  return {
    ...actual,
    selectOpponentPlayers: () => stableOpponents,
  };
});

describe('CombatPanel', () => {
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

  it('renders nothing when no combat actions', () => {
    useGameStore.setState({ legalActions: [] });
    const { container } = render(<CombatPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('renders attacker UI and confirms attackers', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      legalActions: [
        { actionType: LegalActionType.DECLARE_ATTACKERS, objectId: 10 },
        { actionType: LegalActionType.DECLARE_ATTACKERS, objectId: 11 },
      ],
    });
    render(<CombatPanel />);
    expect(screen.getByRole('region', { name: /declare attackers/i })).toBeInTheDocument();

    await user.click(screen.getByText('Creature #10'));
    await user.click(screen.getByText('Confirm Attackers (1)'));
    expect(mockDeclareAttackers).toHaveBeenCalledWith([{ objectId: 10, targetPlayerId: 'p2' }]);
  });

  it('toggles attacker off on second click', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      legalActions: [{ actionType: LegalActionType.DECLARE_ATTACKERS, objectId: 10 }],
    });
    render(<CombatPanel />);
    await user.click(screen.getByText('Creature #10'));
    await user.click(screen.getByText('Creature #10'));
    await user.click(screen.getByText('Confirm Attackers (0)'));
    expect(mockDeclareAttackers).toHaveBeenCalledWith([]);
  });

  it('renders blocker UI and confirms blockers', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      legalActions: [{ actionType: LegalActionType.DECLARE_BLOCKERS, objectId: 20 }],
    });
    render(<CombatPanel />);
    expect(screen.getByRole('region', { name: /declare blockers/i })).toBeInTheDocument();

    await user.click(screen.getByText('Creature #20'));
    await user.click(screen.getByText('Confirm Blockers (1)'));
    expect(mockDeclareBlockers).toHaveBeenCalledWith([{ objectId: 20, blockingId: 0 }]);
  });

  it('toggles blocker off on second click', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      legalActions: [{ actionType: LegalActionType.DECLARE_BLOCKERS, objectId: 20 }],
    });
    render(<CombatPanel />);
    await user.click(screen.getByText('Creature #20'));
    await user.click(screen.getByText('Creature #20'));
    await user.click(screen.getByText('Confirm Blockers (0)'));
    expect(mockDeclareBlockers).toHaveBeenCalledWith([]);
  });
});
