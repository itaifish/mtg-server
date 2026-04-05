import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SpellCastPanel } from '../SpellCastPanel';
import { useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { LegalActionType } from '@/types/enums';

const mockCastSpell = vi.fn();

vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({
    castSpell: mockCastSpell,
    isLoading: false,
  }),
}));

vi.mock('@/api/hooks', () => ({ useApiClient: () => ({}) }));

describe('SpellCastPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.getState().reset();
    useUiStore.getState().reset();
  });

  it('renders nothing when no castable spells', () => {
    useGameStore.setState({ legalActions: [] });
    const { container } = render(<SpellCastPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('renders spell buttons and selects spell', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      legalActions: [
        { actionType: LegalActionType.CAST_SPELL, objectId: 5 },
        { actionType: LegalActionType.CAST_SPELL, objectId: 6 },
      ],
    });
    render(<SpellCastPanel />);
    expect(screen.getByRole('region', { name: /cast spell/i })).toBeInTheDocument();

    await user.click(screen.getByText('Spell #5'));
    expect(useUiStore.getState().selectedObjectId).toBe(5);
  });

  it('shows Cast and Cancel when spell selected', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      legalActions: [{ actionType: LegalActionType.CAST_SPELL, objectId: 5 }],
    });
    useUiStore.setState({ selectedObjectId: 5 });
    render(<SpellCastPanel />);

    expect(screen.getByText('Cast')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    await user.click(screen.getByText('Cast'));
    expect(mockCastSpell).toHaveBeenCalledWith(5, [], undefined);
  });

  it('Cancel deselects and exits targeting', async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      legalActions: [{ actionType: LegalActionType.CAST_SPELL, objectId: 5 }],
    });
    useUiStore.setState({ selectedObjectId: 5 });
    render(<SpellCastPanel />);

    await user.click(screen.getByText('Cancel'));
    expect(useUiStore.getState().selectedObjectId).toBeNull();
  });

  it('shows target count in targeting mode', () => {
    useGameStore.setState({
      legalActions: [{ actionType: LegalActionType.CAST_SPELL, objectId: 5 }],
    });
    useUiStore.setState({
      selectedObjectId: 5,
      targetingMode: { actionType: LegalActionType.CAST_SPELL, requiredTargets: 2, selectedTargets: [{ player: { playerId: 'p1' } }] },
    });
    render(<SpellCastPanel />);
    expect(screen.getByText('Targets: 1/2')).toBeInTheDocument();
  });
});
