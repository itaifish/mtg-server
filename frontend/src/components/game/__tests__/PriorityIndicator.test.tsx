import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityIndicator } from '../PriorityIndicator';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { GameStatus } from '@/types/enums';
import type { GetGameStateResponse } from '@/types/api';

const basePlayers = [
  { playerId: 'p1', name: 'Alice', lifeTotal: 20, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0 },
  { playerId: 'p2', name: 'Bob', lifeTotal: 20, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0 },
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

describe('PriorityIndicator', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
    useLobbyStore.setState({ playerId: 'p1' });
  });

  it('renders nothing when no game state', () => {
    const { container } = render(<PriorityIndicator />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "Your turn" when player has priority and is active', () => {
    setGameState({ priorityPlayerId: 'p1', activePlayerId: 'p1' });
    render(<PriorityIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent('Your turn');
  });

  it('shows opponent name when waiting', () => {
    setGameState({ priorityPlayerId: 'p2' });
    render(<PriorityIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for Bob');
  });

  it('shows game status', () => {
    setGameState({ priorityPlayerId: 'p1', status: GameStatus.IN_PROGRESS });
    render(<PriorityIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent('IN_PROGRESS');
  });

  it('shows "Waiting for opponent" when priority player not found', () => {
    setGameState({ priorityPlayerId: 'unknown' });
    render(<PriorityIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for opponent');
  });

  it('has correct aria-label for my turn', () => {
    setGameState({ priorityPlayerId: 'p1', activePlayerId: 'p1' });
    render(<PriorityIndicator />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Your turn');
  });

  it('has correct aria-label for opponent turn', () => {
    setGameState({ priorityPlayerId: 'p2' });
    render(<PriorityIndicator />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Waiting for Bob');
  });
});
