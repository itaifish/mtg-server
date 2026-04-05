import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GameBoard } from '../GameBoard';

describe('GameBoard', () => {
  it('renders the canvas', () => {
    const { container } = render(<GameBoard />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
