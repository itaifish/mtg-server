import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StackDisplay } from '../StackDisplay';

describe('StackDisplay', () => {
  it('renders empty stack text', () => {
    render(<StackDisplay />);
    expect(screen.getByText('Stack (empty)')).toBeInTheDocument();
  });
});
