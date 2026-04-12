import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CombatPanel } from '../CombatPanel';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { LegalActionType, GameStatus } from '@/types/enums';
import type { PlayerInfo } from '@/types/models';
import type { PermanentInfo } from '@/types/api';

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
  { playerId: 'p1', name: 'Alice', lifeTotal: 20, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0, mulliganCount: 0, hasKept: false },
  { playerId: 'p2', name: 'Bob', lifeTotal: 20, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0, mulliganCount: 0, hasKept: false },
];

const makePermanent = (id: number, name: string, controller: string, opts?: Partial<PermanentInfo>): PermanentInfo => ({
  objectId: id, name, oracleId: 'orc1', controller, owner: controller,
  cardTypes: ['creature'], subtypes: [], tapped: false, summoningSick: false,
  damageMarked: 0, counters: [], keywords: [], power: 2, toughness: 2,
  ...opts,
});

vi.mock('@/stores/gameStore', async () => {
  const actual = await vi.importActual<typeof import('@/stores/gameStore')>('@/stores/gameStore');
  return { ...actual };
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
        battlefield: [
          makePermanent(10, 'Grizzly Bears', 'p1'),
          makePermanent(11, 'Llanowar Elves', 'p1'),
        ],
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
      legalActions: [{ actionType: LegalActionType.DECLARE_ATTACKERS }],
    });
    render(<CombatPanel />);
    expect(screen.getByRole('region', { name: /declare attackers/i })).toBeInTheDocument();

    await user.click(screen.getByText('Grizzly Bears 2/2'));
    await user.click(screen.getByText('Confirm Attackers (1)'));
    expect(mockDeclareAttackers).toHaveBeenCalledWith([{ objectId: 10, targetPlayerId: 'p2' }]);
  });

  it('toggles attacker off on second click', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      legalActions: [{ actionType: LegalActionType.DECLARE_ATTACKERS }],
    });
    render(<CombatPanel />);
    await user.click(screen.getByText('Grizzly Bears 2/2'));
    await user.click(screen.getByText('Grizzly Bears 2/2'));
    await user.click(screen.getByText('Confirm Attackers (0)'));
    expect(mockDeclareAttackers).toHaveBeenCalledWith([]);
  });

  it('renders blocker UI and confirms blockers', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      gameState: {
        gameId: 'g1', status: GameStatus.IN_PROGRESS, players,
        turnNumber: 1, actionCount: 0, priorityPlayerId: 'p1', activePlayerId: 'p2',
        battlefield: [
          makePermanent(20, 'Wall of Omens', 'p1'),
          makePermanent(30, 'Goblin Guide', 'p2'),
        ],
        combat: { attackers: [{ objectId: 30, targetPlayerId: 'p1' }], blockers: [] },
      },
      legalActions: [{ actionType: LegalActionType.DECLARE_BLOCKERS }],
    });
    render(<CombatPanel />);
    expect(screen.getByRole('region', { name: /declare blockers/i })).toBeInTheDocument();

    await user.click(screen.getByText('Goblin Guide'));
    await user.click(screen.getByText('Confirm Blockers (1)'));
    expect(mockDeclareBlockers).toHaveBeenCalledWith([{ objectId: 20, blockingId: 30 }]);
  });

  it('toggles blocker off on second click', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      gameState: {
        gameId: 'g1', status: GameStatus.IN_PROGRESS, players,
        turnNumber: 1, actionCount: 0, priorityPlayerId: 'p1', activePlayerId: 'p2',
        battlefield: [
          makePermanent(20, 'Wall of Omens', 'p1'),
          makePermanent(30, 'Goblin Guide', 'p2'),
        ],
        combat: { attackers: [{ objectId: 30, targetPlayerId: 'p1' }], blockers: [] },
      },
      legalActions: [{ actionType: LegalActionType.DECLARE_BLOCKERS }],
    });
    render(<CombatPanel />);
    await user.click(screen.getByText('Goblin Guide'));
    await user.click(screen.getByText('Goblin Guide'));
    await user.click(screen.getByText('Confirm Blockers (0)'));
    expect(mockDeclareBlockers).toHaveBeenCalledWith([]);
  });
});
