import type { Theme } from './types';

/** Default theme — preserves the existing dark look from global.css. */
export const defaultTheme: Theme = {
  id: 'default',
  name: 'Classic Dark',
  description: 'The original dark theme with gold accents.',

  colors: {
    bg: '#1a1a2e',
    bgSecondary: '#16213e',
    bgTertiary: '#0f3460',
    surface: '#1e2a4a',
    surfaceHover: '#253561',
    accent: '#c9a84c',
    accentDim: '#8a6d2b',
    text: '#e0e0e0',
    textMuted: '#8892a4',
    textOnAccent: '#1a1a2e',
    danger: '#e74c3c',
    success: '#2ecc71',
    border: '#2a3a5c',
    overlay: 'rgba(0, 0, 0, 0.7)',
    manaWhite: '#f9faf4',
    manaBlue: '#0e68ab',
    manaBlack: '#150b00',
    manaRed: '#d3202a',
    manaGreen: '#00733e',
    manaColorless: '#9e9e9e',
  },

  typography: {
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    headingFontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    fontWeight: { normal: 400, bold: 700, heading: 600 },
  },

  layout: {
    borderRadius: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
  },

  scene: {
    tableSurface: '#2a3a5c',
    ambientLightIntensity: 0.6,
    directionalLightIntensity: 0.8,
    cardBack: '#6b3a2a',
    cardGlowSelected: '#c9a84c',
    cardGlowHover: '#e0e0e0',
    cardGlowNone: '#000000',
    cardHighlight: '#2ecc71',
    zoneLabelColor: '#c9a84c',
    cardColors: {
      white: '#f9faf4',
      blue: '#0e68ab',
      black: '#150b00',
      red: '#d3202a',
      green: '#00733e',
      colorless: '#beb9b2',
    },
    cardTextOnDark: '#e0e0e0',
    cardTextOnLight: '#1a1a2e',
  },

  particles: {
    damage: '#e74c3c',
    heal: ['#2ecc71', '#27ae60'],
  },
};
