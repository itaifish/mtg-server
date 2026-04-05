import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManaPanel } from '../ManaPanel';
import { useGameStore } from '@/stores/gameStore';
import { LegalActionType } from '@/types/enums';

const mockActivateManaAbility = vi.fn();

vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({
    activateManaAbility: mockActivateManaAbility,
    isLoading: false,
  }),
}));

vi.mock('@/api/hooks', () => ({ useApiClient: () => ({}) }));

describe('ManaPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().reset();
  });

  it('renders nothing when no mana abilities', () => {
    useGameStore.setState({ legalActions: [] });
    const { container } = render(<ManaPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('renders mana ability buttons and activates on click', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      legalActions: [
        { actionType: LegalActionType.ACTIVATE_MANA_ABILITY, objectId: 12 },
        { actionType: LegalActionType.ACTIVATE_MANA_ABILITY, objectId: 13 },
      ],
    });
    render(<ManaPanel />);
    expect(screen.getByRole('region', { name: /mana abilities/i })).toBeInTheDocument();
    expect(screen.getByText('Tap #12')).toBeInTheDocument();

    await user.click(screen.getByText('Tap #12'));
    expect(mockActivateManaAbility).toHaveBeenCalledWith(12, 0);
  });
});
