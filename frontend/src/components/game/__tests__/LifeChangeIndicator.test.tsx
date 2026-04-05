import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LifeChangeIndicator } from '../LifeChangeIndicator';

describe('LifeChangeIndicator', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders nothing initially', () => {
    const { container } = render(<LifeChangeIndicator life={20} />);
    expect(container.querySelector('[aria-live]')).not.toBeInTheDocument();
  });

  it('shows positive change in green', () => {
    const { rerender } = render(<LifeChangeIndicator life={20} />);
    rerender(<LifeChangeIndicator life={23} />);
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('shows negative change', () => {
    const { rerender } = render(<LifeChangeIndicator life={20} />);
    rerender(<LifeChangeIndicator life={17} />);
    expect(screen.getByText('-3')).toBeInTheDocument();
  });

  it('removes change after timeout', () => {
    const { rerender } = render(<LifeChangeIndicator life={20} />);
    rerender(<LifeChangeIndicator life={22} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1600); });
    expect(screen.queryByText('+2')).not.toBeInTheDocument();
  });
});
