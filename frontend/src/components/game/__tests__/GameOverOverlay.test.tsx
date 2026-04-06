import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GameOverOverlay } from '../GameOverOverlay';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('GameOverOverlay', () => {
  it('displays winner name', () => {
    render(
      <MemoryRouter>
        <GameOverOverlay players={[
          { playerId: 'p1', name: 'Alice', lifeTotal: 5, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0 },
          { playerId: 'p2', name: 'Bob', lifeTotal: 0, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0 },
        ]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Game Over')).toBeInTheDocument();
    expect(screen.getByText('Alice wins!')).toBeInTheDocument();
  });

  it('handles no winner (all dead)', () => {
    render(
      <MemoryRouter>
        <GameOverOverlay players={[
          { playerId: 'p1', name: 'Alice', lifeTotal: 0, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0 },
          { playerId: 'p2', name: 'Bob', lifeTotal: 0, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0 },
        ]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Game Over')).toBeInTheDocument();
    expect(screen.queryByText(/wins/)).not.toBeInTheDocument();
  });

  it('navigates to lobby on Back button click', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GameOverOverlay players={[
          { playerId: 'p1', name: 'Alice', lifeTotal: 10, ready: true, handSize: 7, librarySize: 53, poisonCounters: 0 },
        ]} />
      </MemoryRouter>,
    );
    await user.click(screen.getByText('Back to Lobby'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
