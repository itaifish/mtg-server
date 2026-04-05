import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/theme', async () => {
  const { defaultTheme } = await import('@/theme/defaultTheme');
  return {
    useTheme: () => ({ theme: defaultTheme, setTheme: vi.fn(), availableThemes: [defaultTheme] }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    defaultTheme,
  };
});

import { GameBoard } from '../GameBoard';

describe('GameBoard', () => {
  it('renders the canvas', () => {
    const { container } = render(<GameBoard />);
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
