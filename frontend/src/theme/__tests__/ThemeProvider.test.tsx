import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeProvider';
import { picassoTheme } from '../picassoTheme';

// Mock the storage service
vi.mock('../../services/storage', () => ({
  storage: {
    loadSettings: vi.fn().mockResolvedValue(null),
    saveSettings: vi.fn().mockResolvedValue(undefined),
  },
}));

/** Test component that exposes theme context values. */
function ThemeConsumer() {
  const { theme, setTheme, availableThemes } = useTheme();
  return (
    <div>
      <span data-testid="theme-id">{theme.id}</span>
      <span data-testid="theme-name">{theme.name}</span>
      <span data-testid="theme-count">{availableThemes.length}</span>
      <button onClick={() => setTheme('picasso')}>Switch to Picasso</button>
      <button onClick={() => setTheme('default')}>Switch to Default</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Clean up injected styles and attributes
    document.getElementById('theme-css-overrides')?.remove();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
  });

  it('provides the picasso theme by default', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme-id').textContent).toBe('picasso');
    expect(screen.getByTestId('theme-name').textContent).toBe('Cubist Avant-Garde');
  });

  it('exposes available themes', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme-count').textContent).toBe('3');
  });

  it('switches themes via setTheme', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText('Switch to Picasso').click();
    });

    expect(screen.getByTestId('theme-id').textContent).toBe('picasso');
    expect(screen.getByTestId('theme-name').textContent).toBe('Cubist Avant-Garde');
  });

  it('injects CSS custom properties on the document root', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-bg')).toBe(picassoTheme.colors.bg);
    expect(root.style.getPropertyValue('--color-gold')).toBe(picassoTheme.colors.accent);
    expect(root.style.getPropertyValue('--color-text')).toBe(picassoTheme.colors.text);
  });

  it('updates CSS variables when theme changes', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText('Switch to Picasso').click();
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-bg')).toBe(picassoTheme.colors.bg);
    expect(root.style.getPropertyValue('--color-gold')).toBe(picassoTheme.colors.accent);
  });

  it('injects cssOverrides style tag for picasso theme', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText('Switch to Picasso').click();
    });

    const styleTag = document.getElementById('theme-css-overrides');
    expect(styleTag).not.toBeNull();
    expect(styleTag?.textContent).toContain('data-theme="picasso"');
    expect(document.documentElement.getAttribute('data-theme')).toBe('picasso');
  });

  it('removes cssOverrides style tag when switching back to default', async () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText('Switch to Picasso').click();
    });
    expect(document.getElementById('theme-css-overrides')).not.toBeNull();

    await act(async () => {
      screen.getByText('Switch to Default').click();
    });
    expect(document.getElementById('theme-css-overrides')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('falls back to default for unknown theme id', async () => {
    function BadSwitcher() {
      const { theme, setTheme } = useTheme();
      return (
        <div>
          <span data-testid="id">{theme.id}</span>
          <button onClick={() => setTheme('nonexistent')}>Bad Switch</button>
        </div>
      );
    }

    render(
      <ThemeProvider>
        <BadSwitcher />
      </ThemeProvider>,
    );

    await act(async () => {
      screen.getByText('Bad Switch').click();
    });

    expect(screen.getByTestId('id').textContent).toBe('picasso');
  });
});

describe('useTheme', () => {
  it('throws when used outside ThemeProvider', () => {
    function Orphan() {
      useTheme();
      return null;
    }

    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow('useTheme must be used within a ThemeProvider');
    spy.mockRestore();
  });
});
