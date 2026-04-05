import type { Theme } from './types';

/** Cubist Avant-Garde theme — bold, fragmented, Picasso-inspired. */
export const picassoTheme: Theme = {
  id: 'picasso',
  name: 'Cubist Avant-Garde',
  description: 'A bold, fragmented aesthetic inspired by Picasso and cubist art.',

  colors: {
    bg: '#2a1f1f',
    bgSecondary: '#3b2c2c',
    bgTertiary: '#1a1226',
    surface: '#3d2e2e',
    surfaceHover: '#4e3a3a',
    accent: '#d4622b',
    accentDim: '#8b4513',
    text: '#f5e6c8',
    textMuted: '#b8a080',
    textOnAccent: '#f5e6c8',
    danger: '#e8302a',
    success: '#4caf50',
    border: '#6b4226',
    overlay: 'rgba(42, 31, 31, 0.85)',
    manaWhite: '#fff8dc',
    manaBlue: '#1e3fae',
    manaBlack: '#1a0a00',
    manaRed: '#e02020',
    manaGreen: '#228b22',
    manaColorless: '#a89070',
  },

  typography: {
    fontFamily: "'Century Gothic', 'Futura', 'Gill Sans', sans-serif",
    headingFontFamily: "'Futura', 'Century Gothic', 'Gill Sans', sans-serif",
    fontWeight: { normal: 400, bold: 800, heading: 900 },
  },

  layout: {
    borderRadius: '2px',
    borderWidth: '3px',
    borderStyle: 'double',
  },

  scene: {
    tableSurface: '#8B6914',
    ambientLightIntensity: 0.4,
    directionalLightIntensity: 1.2,
    cardBack: '#1a1a30',
    cardGlowSelected: '#ff6600',
    cardGlowHover: '#00e5ff',
    cardGlowNone: '#000000',
    cardHighlight: '#ffeb3b',
    zoneLabelColor: '#d4622b',
    cardColors: {
      white: '#fff5cc',
      blue: '#1a47c2',
      black: '#2a1500',
      red: '#e83020',
      green: '#1b8c1b',
      colorless: '#9c8060',
    },
    cardTextOnDark: '#f5e6c8',
    cardTextOnLight: '#2a1f1f',
  },

  particles: {
    damage: '#ff8c00',
    heal: ['#9c27b0', '#e040fb', '#ce93d8'],
  },

  cssOverrides: `
    /* Cubist asymmetric borders on buttons */
    [data-theme="picasso"] button {
      border-width: 2px 3px 4px 2px;
      border-style: double;
      transform: skewX(-2deg);
      clip-path: polygon(4% 0%, 100% 2%, 96% 100%, 0% 98%);
    }
    [data-theme="picasso"] button:hover {
      transform: skewX(-2deg) scale(1.05);
    }

    /* Panels get colored shadows and asymmetric radii */
    [data-theme="picasso"] .panel,
    [data-theme="picasso"] .modal-panel,
    [data-theme="picasso"] .card {
      border-radius: 0 8px 2px 12px;
      box-shadow: -3px 4px 0 #d4622b44, 3px -2px 0 #1e3fae44;
      border-width: 1px 3px 4px 1px;
    }

    /* Modal overlay */
    [data-theme="picasso"] .modal-overlay {
      background: rgba(42, 31, 31, 0.9);
    }

    /* Page containers get geometric gradient overlay */
    [data-theme="picasso"] .page-container {
      background-image: linear-gradient(135deg, transparent 60%, #d4622b11 60%, #d4622b11 70%, transparent 70%),
                         linear-gradient(45deg, transparent 70%, #1e3fae11 70%);
    }

    /* Game page subtle background pattern */
    [data-theme="picasso"] .game-page {
      background-image: repeating-linear-gradient(
        120deg, transparent, transparent 40px, #d4622b08 40px, #d4622b08 80px
      );
    }

    /* Action bar */
    [data-theme="picasso"] .action-bar {
      border-radius: 0 8px 2px 12px;
      box-shadow: -3px 4px 0 #d4622b44, 3px -2px 0 #1e3fae44;
    }

    /* Player panel */
    [data-theme="picasso"] .player-panel {
      border-radius: 0 8px 2px 12px;
      box-shadow: -3px 4px 0 #d4622b44, 3px -2px 0 #1e3fae44;
    }

    /* Slight rotations on game list items */
    [data-theme="picasso"] .card:nth-child(odd) {
      transform: rotate(-0.3deg);
    }
    [data-theme="picasso"] .card:nth-child(even) {
      transform: rotate(0.4deg);
    }

    /* Headings get angular treatment */
    [data-theme="picasso"] h1,
    [data-theme="picasso"] h2,
    [data-theme="picasso"] h3 {
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-bottom: 3px double currentColor;
      display: inline-block;
      padding-bottom: 2px;
    }

    /* Inputs get cubist framing */
    [data-theme="picasso"] input,
    [data-theme="picasso"] select,
    [data-theme="picasso"] textarea {
      border-width: 1px 2px 3px 1px;
      border-style: double;
      border-radius: 0 4px 0 4px;
    }
  `,
};
