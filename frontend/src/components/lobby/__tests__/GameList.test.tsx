import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameList } from '../GameList';
import type { GameSummary } from '@/stores/lobbyStore';

describe('GameList', () => {
  it('shows empty message when no games', () => {
    render(<GameList games={[]} onJoin={vi.fn()} />);
    expect(screen.getByText(/no games available/i)).toBeInTheDocument();
  });

  it('renders game entries', () => {
    const games: GameSummary[] = [
      { gameId: 'g1', format: 'STANDARD', playerCount: 1, status: 'WAITING_FOR_PLAYERS' },
      { gameId: 'g2', format: 'MODERN', playerCount: 2, status: 'IN_PROGRESS' },
    ];
    render(<GameList games={games} onJoin={vi.fn()} />);
    expect(screen.getByText('STANDARD')).toBeInTheDocument();
    expect(screen.getByText('MODERN')).toBeInTheDocument();
  });

  it('shows Join button only for waiting games', () => {
    const games: GameSummary[] = [
      { gameId: 'g1', format: 'STANDARD', playerCount: 1, status: 'WAITING_FOR_PLAYERS' },
      { gameId: 'g2', format: 'MODERN', playerCount: 2, status: 'IN_PROGRESS' },
    ];
    render(<GameList games={games} onJoin={vi.fn()} />);
    const joinButtons = screen.getAllByText('Join');
    expect(joinButtons).toHaveLength(1);
  });

  it('calls onJoin with gameId', async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn();
    const games: GameSummary[] = [
      { gameId: 'g1', format: 'STANDARD', playerCount: 1, status: 'WAITING_FOR_PLAYERS' },
    ];
    render(<GameList games={games} onJoin={onJoin} />);
    await user.click(screen.getByText('Join'));
    expect(onJoin).toHaveBeenCalledWith('g1');
  });
});
