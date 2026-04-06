import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerPanel } from '../PlayerPanel';
import type { PlayerInfo } from '@/types/models';

describe('PlayerPanel', () => {
  const player: PlayerInfo = {
    playerId: 'p1',
    name: 'Alice',
    lifeTotal: 20,
    ready: true, handSize: 7, librarySize: 53, poisonCounters: 0,
  };

  it('displays player name and life total', () => {
    render(<PlayerPanel player={player} isActive={false} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByLabelText('Life total: 20')).toHaveTextContent('20');
  });

  it('shows hand size and library size', () => {
    render(<PlayerPanel player={player} isActive={false} />);
    expect(screen.getByTitle('Cards in hand')).toHaveTextContent('7');
    expect(screen.getByTitle('Cards in library')).toHaveTextContent('53');
  });

  it('highlights active player', () => {
    const { container } = render(<PlayerPanel player={player} isActive={true} />);
    const panel = container.firstElementChild as HTMLElement;
    expect(panel.style.border).toContain('var(--color-gold)');
  });
});
