import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Theme, ThemeContextValue } from './types';
import { defaultTheme } from './defaultTheme';
import { picassoTheme } from './picassoTheme';
import { shatteredTheme } from './shatteredTheme';
import { storage } from '../services/storage';

const THEME_STORAGE_KEY = 'mtg-theme-id';
const STYLE_TAG_ID = 'theme-css-overrides';

const themes: Theme[] = [defaultTheme, picassoTheme, shatteredTheme];

function findTheme(id: string): Theme {
  return themes.find((t) => t.id === id) ?? picassoTheme;
}

/** Inject theme colors as CSS custom properties on :root. */
function applyColors(colors: Theme['colors']): void {
  const root = document.documentElement;
  root.style.setProperty('--color-bg', colors.bg);
  root.style.setProperty('--color-bg-secondary', colors.bgSecondary);
  root.style.setProperty('--color-bg-tertiary', colors.bgTertiary);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-surface-hover', colors.surfaceHover);
  root.style.setProperty('--color-gold', colors.accent);
  root.style.setProperty('--color-gold-dim', colors.accentDim);
  root.style.setProperty('--color-text', colors.text);
  root.style.setProperty('--color-text-muted', colors.textMuted);
  root.style.setProperty('--color-danger', colors.danger);
  root.style.setProperty('--color-success', colors.success);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-white-mana', colors.manaWhite);
  root.style.setProperty('--color-blue-mana', colors.manaBlue);
  root.style.setProperty('--color-black-mana', colors.manaBlack);
  root.style.setProperty('--color-red-mana', colors.manaRed);
  root.style.setProperty('--color-green-mana', colors.manaGreen);
  root.style.setProperty('--color-colorless-mana', colors.manaColorless);
  root.style.setProperty('--color-overlay', colors.overlay);
}

/** Apply typography CSS custom properties. */
function applyTypography(typography: Theme['typography']): void {
  const root = document.documentElement;
  root.style.setProperty('--font-main', typography.fontFamily);
  root.style.setProperty('--font-heading', typography.headingFontFamily);
}

/** Apply layout CSS custom properties. */
function applyLayout(layout: Theme['layout']): void {
  const root = document.documentElement;
  root.style.setProperty('--radius', layout.borderRadius);
  root.style.setProperty('--border-width', layout.borderWidth);
  root.style.setProperty('--border-style', layout.borderStyle);
}

/** Inject or remove the cssOverrides <style> tag and data-theme attribute. */
function applyCssOverrides(theme: Theme): void {
  let tag = document.getElementById(STYLE_TAG_ID);
  if (theme.cssOverrides) {
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_TAG_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = theme.cssOverrides;
    document.documentElement.setAttribute('data-theme', theme.id);
  } else {
    tag?.remove();
    document.documentElement.removeAttribute('data-theme');
  }
}

function applyTheme(theme: Theme): void {
  applyColors(theme.colors);
  applyTypography(theme.typography);
  applyLayout(theme.layout);
  applyCssOverrides(theme);
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Provides the current theme via React context and injects CSS variables. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(picassoTheme);

  // Load persisted theme on mount
  useEffect(() => {
    storage.loadSettings().then((raw) => {
      if (!raw) return;
      try {
        const settings: Record<string, unknown> = JSON.parse(raw);
        if (typeof settings[THEME_STORAGE_KEY] === 'string') {
          const loaded = findTheme(settings[THEME_STORAGE_KEY] as string);
          setThemeState(loaded);
        }
      } catch {
        // ignore corrupt settings
      }
    });
  }, []);

  // Apply CSS whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((themeId: string) => {
    const next = findTheme(themeId);
    setThemeState(next);
    // Persist asynchronously
    storage.loadSettings().then((raw) => {
      const settings: Record<string, unknown> = raw ? JSON.parse(raw) : {};
      settings[THEME_STORAGE_KEY] = themeId;
      storage.saveSettings(JSON.stringify(settings));
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, availableThemes: themes }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Hook to access the current theme, setTheme, and available themes. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
