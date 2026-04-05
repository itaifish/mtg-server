import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUiStore } from '@/stores/uiStore';

vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({
    concede: vi.fn(), declareAttackers: vi.fn(), declareBlockers: vi.fn(),
    activateManaAbility: vi.fn(), castSpell: vi.fn(), passPriority: vi.fn(),
    playLand: vi.fn(), chooseFirstPlayer: vi.fn(), keepHand: vi.fn(),
    mulligan: vi.fn(), isLoading: false, error: null,
  }),
}));

vi.mock('@/theme', async () => {
  const { defaultTheme } = await import('@/theme/defaultTheme');
  return {
    useTheme: () => ({ theme: defaultTheme, setTheme: vi.fn(), availableThemes: [defaultTheme] }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    defaultTheme,
  };
});

import { App } from '../App';

describe('App extended', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.getState().reset();
  });

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('mtg-settings', '{invalid');
    render(<App />);
    expect(screen.getByText('Project Lasagna')).toBeInTheDocument();
  });

  it('opens and closes settings panel', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText('Settings'));
    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    await user.click(screen.getByText('Done'));
    expect(screen.queryByRole('dialog', { name: /settings/i })).not.toBeInTheDocument();
  });

  it('reads config from localStorage', () => {
    localStorage.setItem('mtg-settings', JSON.stringify({ serverUrl: 'http://custom.com', apiKey: 'key' }));
    render(<App />);
    expect(screen.getByText('Project Lasagna')).toBeInTheDocument();
  });
});
