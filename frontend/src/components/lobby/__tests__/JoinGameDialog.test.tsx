import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JoinGameDialog } from '../JoinGameDialog';
import { useLobbyStore } from '@/stores/lobbyStore';

vi.mock('@/api/hooks', () => ({ useApiClient: () => ({}) }));

describe('JoinGameDialog', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useLobbyStore.getState().reset();
  });

  it('renders modal with form', () => {
    render(<JoinGameDialog gameId="g1" onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: /join game/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/player name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/decklist/i)).toBeInTheDocument();
  });

  it('shows error when name is empty', async () => {
    const user = userEvent.setup();
    render(<JoinGameDialog gameId="g1" onClose={onClose} />);
    await user.click(screen.getByText('Join'));
    expect(screen.getByRole('alert')).toHaveTextContent('Player name is required');
  });

  it('shows error when decklist is empty', async () => {
    const user = userEvent.setup();
    useLobbyStore.setState({ playerName: 'Alice' });
    render(<JoinGameDialog gameId="g1" onClose={onClose} />);
    await user.click(screen.getByText('Join'));
    expect(screen.getByRole('alert')).toHaveTextContent('Decklist must have at least one card');
  });

  it('submits with valid data', async () => {
    const user = userEvent.setup();
    const joinGame = vi.fn();
    useLobbyStore.setState({ playerName: 'Alice', joinGame });
    render(<JoinGameDialog gameId="g1" onClose={onClose} />);
    await user.type(screen.getByLabelText(/decklist/i), '4 Lightning Bolt');
    await user.click(screen.getByText('Join'));
    expect(joinGame).toHaveBeenCalled();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    render(<JoinGameDialog gameId="g1" onClose={onClose} />);
    await user.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
