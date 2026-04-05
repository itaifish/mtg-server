import type { Theme } from './types';

/** Shattered Glass theme — a smashed stained glass window reassembled wrong.
 *  Neon colors bleeding through cracks, fragments at crazy angles, glitch artifacts. */
export const shatteredTheme: Theme = {
  id: 'shattered',
  name: 'Shattered Glass',
  description:
    'A stained glass window smashed and reassembled wrong — neon light bleeding through cracks, fragments at crazy angles, glitch-like visual artifacts.',

  colors: {
    bg: '#0a0612',
    bgSecondary: '#1a0a2e',
    bgTertiary: '#120822',
    surface: '#0d1a2f',
    surfaceHover: '#162440',
    accent: '#00fff2',
    accentDim: '#007a75',
    text: '#e8f0ff',
    textMuted: '#9a8ec2',
    textOnAccent: '#0a0612',
    danger: '#ff0066',
    success: '#39ff14',
    border: '#8b00ff',
    overlay: 'rgba(10, 6, 18, 0.9)',
    manaWhite: '#ffffff',
    manaBlue: '#0088ff',
    manaBlack: '#1a0033',
    manaRed: '#ff2222',
    manaGreen: '#00ff44',
    manaColorless: '#c0c0ff',
  },

  typography: {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    headingFontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    fontWeight: { normal: 300, bold: 700, heading: 900 },
  },

  layout: {
    borderRadius: '0px',
    borderWidth: '2px',
    borderStyle: 'solid',
  },

  scene: {
    tableSurface: '#0a0015',
    ambientLightIntensity: 0.3,
    directionalLightIntensity: 1.5,
    cardBack: '#1a0033',
    cardGlowSelected: '#00fff2',
    cardGlowHover: '#ff0066',
    cardGlowNone: '#000000',
    cardHighlight: '#39ff14',
    zoneLabelColor: '#00fff2',
    cardColors: {
      white: '#ffffff',
      blue: '#0088ff',
      black: '#1a0033',
      red: '#ff2222',
      green: '#00ff44',
      colorless: '#c0c0ff',
    },
    cardTextOnDark: '#e8f0ff',
    cardTextOnLight: '#0a0612',
  },

  particles: {
    damage: '#ff0066',
    heal: ['#00fff2', '#ffffff', '#39ff14'],
  },

  cssOverrides: `
    /* === SHATTERED GLASS — glitch artifacts & neon fractures === */

    /* Stepped/glitchy transitions globally */
    [data-theme="shattered"] * {
      transition-timing-function: steps(3) !important;
    }

    /* Neon glow panels with shard clip-path */
    [data-theme="shattered"] .panel {
      border: 2px solid #8b00ff;
      box-shadow: 0 0 8px #8b00ff88, inset 0 0 8px #00fff211, 0 0 20px #8b00ff33;
      background: linear-gradient(135deg, #0d1a2f 0%, #1a0a2e 50%, #0a0612 100%);
      clip-path: polygon(0% 2%, 3% 0%, 98% 0%, 100% 3%, 100% 97%, 97% 100%, 2% 100%, 0% 98%);
    }

    /* Glitch headings with chromatic aberration */
    [data-theme="shattered"] h1,
    [data-theme="shattered"] h2,
    [data-theme="shattered"] h3 {
      text-shadow: 2px 0 #ff0066, -2px 0 #00fff2, 0 0 10px #8b00ff88;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    /* Prismatic rainbow borders on inputs */
    [data-theme="shattered"] input,
    [data-theme="shattered"] select,
    [data-theme="shattered"] textarea {
      border-top: 2px solid #ff0066;
      border-right: 2px solid #00fff2;
      border-bottom: 2px solid #39ff14;
      border-left: 2px solid #8b00ff;
      background: #0d1a2f;
      box-shadow: 0 0 6px #8b00ff44;
    }

    /* Glass shard buttons */
    [data-theme="shattered"] button {
      clip-path: polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%);
      border: none;
      box-shadow: 0 0 12px #00fff244, inset 0 0 20px #00fff211;
      text-shadow: 0 0 8px #00fff288;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      transition: all 0.1s steps(2);
    }
    [data-theme="shattered"] button:hover {
      box-shadow: 0 0 20px #ff006644, 0 0 40px #00fff233, inset 0 0 30px #ff006622;
      transform: scale(1.03) rotate(-0.5deg);
      text-shadow: 0 0 12px #ff0066;
    }

    /* Fracture-line background cracks */
    [data-theme="shattered"] .page-container {
      background:
        linear-gradient(23deg, transparent 49.5%, #8b00ff22 49.5%, #8b00ff22 50.5%, transparent 50.5%),
        linear-gradient(156deg, transparent 49.5%, #ff006611 49.5%, #ff006611 50.5%, transparent 50.5%),
        linear-gradient(87deg, transparent 49.5%, #00fff208 49.5%, #00fff208 50.5%, transparent 50.5%),
        linear-gradient(200deg, transparent 49.5%, #39ff1408 49.5%, #39ff1408 50.5%, transparent 50.5%);
    }

    /* Nav bar neon underline glow */
    [data-theme="shattered"] nav {
      border-bottom: 2px solid #8b00ff;
      box-shadow: 0 2px 15px #8b00ff66, 0 1px 5px #00fff233;
    }

    /* Labels with glitch offset */
    [data-theme="shattered"] label {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.75em;
      color: #9a8ec2;
      text-shadow: 1px 0 #ff006644;
    }

    /* Modal with dramatic glow and shard clip */
    [data-theme="shattered"] .modal-panel {
      border: 2px solid #00fff2;
      box-shadow: 0 0 30px #00fff233, 0 0 60px #8b00ff22, inset 0 0 20px #00fff208;
      clip-path: polygon(0% 1%, 2% 0%, 99% 0%, 100% 2%, 100% 99%, 98% 100%, 1% 100%, 0% 98%);
    }

    /* Alternating fragment rotations on cards */
    [data-theme="shattered"] .card {
      transform: rotate(-1deg);
      border-left: 3px solid #ff0066;
      border-right: 3px solid #00fff2;
    }
    [data-theme="shattered"] .card:nth-child(even) {
      transform: rotate(0.8deg);
      border-left: 3px solid #39ff14;
      border-right: 3px solid #8b00ff;
    }

    /* Modal overlay */
    [data-theme="shattered"] .modal-overlay {
      background: rgba(10, 6, 18, 0.9);
    }

    /* Action bar shard styling */
    [data-theme="shattered"] .action-bar {
      border: 2px solid #8b00ff;
      box-shadow: 0 0 8px #8b00ff88, inset 0 0 8px #00fff211;
      clip-path: polygon(0% 2%, 3% 0%, 98% 0%, 100% 3%, 100% 97%, 97% 100%, 2% 100%, 0% 98%);
    }

    /* Player panel neon glow */
    [data-theme="shattered"] .player-panel {
      border: 2px solid #8b00ff;
      box-shadow: 0 0 8px #8b00ff88, inset 0 0 8px #00fff211;
    }

    /* Game page fracture overlay */
    [data-theme="shattered"] .game-page {
      background-image:
        linear-gradient(45deg, transparent 49%, #8b00ff11 49%, #8b00ff11 51%, transparent 51%),
        linear-gradient(135deg, transparent 49%, #ff006609 49%, #ff006609 51%, transparent 51%);
    }
  `,
};
