import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateGameForm } from '../CreateGameForm';
import { useLobbyStore } from '@/stores/lobbyStore';

// Mock the API client hook
vi.mock('@/api/hooks', () => ({
  useApiClient: () => ({}),
}));

describe('CreateGameForm', () => {
  beforeEach(() => {
    useLobbyStore.setState({ playerName: '', isCreating: false, error: null });
  });

  it('renders form fields', () => {
    render(<CreateGameForm />);
    expect(screen.getByLabelText('Player Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Format')).toBeInTheDocument();
    expect(screen.getByLabelText('Decklist')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create game/i })).toBeInTheDocument();
  });

  it('shows error when game name is empty', async () => {
    const user = userEvent.setup();
    render(<CreateGameForm />);
    await user.click(screen.getByRole('button', { name: /create game/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Game name is required');
  });

  it('shows error when decklist is empty', async () => {
    const user = userEvent.setup();
    useLobbyStore.setState({ playerName: 'Test Player' });
    render(<CreateGameForm />);
    await user.type(screen.getByLabelText('Game Name'), 'My Game');
    await user.click(screen.getByRole('button', { name: /create game/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Decklist must have at least one card');
  });

  it('calls createGame on valid submission', async () => {
    const user = userEvent.setup();
    const createGame = vi.fn();
    useLobbyStore.setState({ playerName: 'Test Player', createGame });
    render(<CreateGameForm />);
    await user.type(screen.getByLabelText('Game Name'), 'My Game');
    await user.type(screen.getByLabelText('Decklist'), '4 Lightning Bolt');
    await user.click(screen.getByRole('button', { name: /create game/i }));
    expect(createGame).toHaveBeenCalledWith(
      expect.anything(),
      'STANDARD',
      'My Game',
      'Test Player',
      [{ count: 4, cardName: 'Lightning Bolt' }],
    );
  });
});
