import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhaseIndicator } from '../PhaseIndicator';
import { GameStatus, GamePhase } from '@/types/enums';

describe('PhaseIndicator', () => {
  it('renders pregame label when not in progress', () => {
    render(<PhaseIndicator currentStatus={GameStatus.MULLIGAN} />);
    expect(screen.getByText('Mulligan')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /game status: mulligan/i })).toBeInTheDocument();
  });

  it('renders phase steps when in progress', () => {
    render(<PhaseIndicator currentStatus={GameStatus.IN_PROGRESS} currentPhase={GamePhase.PRECOMBAT_MAIN} />);
    expect(screen.getByText('M1')).toBeInTheDocument();
    expect(screen.getByText('M2')).toBeInTheDocument();
    expect(screen.getByText('ATK')).toBeInTheDocument();
  });

  it('shows lands played this turn', () => {
    render(<PhaseIndicator currentStatus={GameStatus.IN_PROGRESS} currentPhase={GamePhase.PRECOMBAT_MAIN} landsPlayedThisTurn={1} />);
    expect(screen.getByText('🏔️ 1/1')).toBeInTheDocument();
  });
});
