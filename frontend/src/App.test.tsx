import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/theme', async () => {
  const { defaultTheme } = await import('@/theme/defaultTheme');
  return {
    useTheme: () => ({ theme: defaultTheme, setTheme: vi.fn(), availableThemes: [defaultTheme] }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    defaultTheme,
  };
});

import { App } from './App';

describe('App', () => {
  it('renders the home page', () => {
    render(<App />);
    expect(screen.getByText('Project Lasagna')).toBeInTheDocument();
  });
});
