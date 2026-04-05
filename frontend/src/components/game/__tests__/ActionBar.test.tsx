import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionBar } from '../ActionBar';
import { LegalActionType, GameStatus } from '@/types/enums';
import type { LegalAction } from '@/types/models';

vi.mock('@/api/hooks', () => ({
  useApiClient: () => ({}),
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
    render(<ActionBar {...baseProps} isMyTurn={false} legalActions={[]} />);
    expect(screen.getByText(/waiting for opponent/i)).toBeInTheDocument();
  });

  it('calls onAction when button clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const actions: LegalAction[] = [{ actionType: LegalActionType.PASS_PRIORITY }];
    render(<ActionBar {...baseProps} legalActions={actions} onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: /pass priority/i }));
    expect(onAction).toHaveBeenCalledWith({ passPriority: {} });
  });

  it('renders concede as danger variant', () => {
    const actions: LegalAction[] = [{ actionType: LegalActionType.CONCEDE }];
    render(<ActionBar {...baseProps} legalActions={actions} />);
    expect(screen.getByRole('button', { name: /concede/i })).toBeInTheDocument();
  });
});
