import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionBar } from '../ActionBar';
import { LegalActionType, GameStatus } from '@/types/enums';
import type { LegalAction } from '@/types/models';

vi.mock('@/api/hooks', () => ({
  useApiClient: () => ({}),
}));

vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({
    passPriority: vi.fn(),
    concede: vi.fn(),
    isLoading: false,
  }),
}));

describe('ActionBar', () => {
  const baseProps = {
    isMyTurn: true,
    isSubmitting: false,
    onAction: vi.fn(),
  };

  it('renders buttons for legal actions during pregame', () => {
    const actions: LegalAction[] = [
      { actionType: LegalActionType.PASS_PRIORITY },
      { actionType: LegalActionType.KEEP_HAND },
    ];
    render(<ActionBar {...baseProps} legalActions={actions} gameStatus={GameStatus.MULLIGAN} />);
    expect(screen.getByRole('button', { name: /pass priority/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep hand/i })).toBeInTheDocument();
  });

  it('shows waiting message when not my turn', () => {
    render(<ActionBar {...baseProps} isMyTurn={false} legalActions={[]} gameStatus={GameStatus.IN_PROGRESS} />);
    expect(screen.getByText(/waiting/i)).toBeInTheDocument();
  });

  it('shows pass priority and pass turn when can pass', () => {
    const actions: LegalAction[] = [{ actionType: LegalActionType.PASS_PRIORITY }];
    render(<ActionBar {...baseProps} legalActions={actions} gameStatus={GameStatus.IN_PROGRESS} />);
    expect(screen.getByRole('button', { name: /pass priority/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pass turn/i })).toBeInTheDocument();
  });

  it('hides concede in menu', async () => {
    const user = userEvent.setup();
    render(<ActionBar {...baseProps} legalActions={[]} gameStatus={GameStatus.IN_PROGRESS} />);
    // Concede should not be visible initially
    expect(screen.queryByText(/concede/i)).not.toBeInTheDocument();
    // Click menu button
    await user.click(screen.getByRole('button', { name: '⋯' }));
    expect(screen.getByText(/concede/i)).toBeInTheDocument();
  });
});
