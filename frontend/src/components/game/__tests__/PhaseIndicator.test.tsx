import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhaseIndicator } from '../PhaseIndicator';
import { GameStatus } from '@/types/enums';

describe('PhaseIndicator', () => {
  it('renders all phase labels', () => {
    render(<PhaseIndicator currentStatus={GameStatus.IN_PROGRESS} />);
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('Play Order')).toBeInTheDocument();
    expect(screen.getByText('Mulligan')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Finished')).toBeInTheDocument();
  });

  it('has aria-label with current status', () => {
    render(<PhaseIndicator currentStatus={GameStatus.MULLIGAN} />);
    expect(screen.getByRole('status', { name: /current phase: MULLIGAN/i })).toBeInTheDocument();
  });
});
