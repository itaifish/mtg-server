/** Color tokens injected as CSS custom properties. */
export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  surface: string;
  surfaceHover: string;
  accent: string;
  accentDim: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
  danger: string;
  success: string;
  border: string;
  overlay: string;
  manaWhite: string;
  manaBlue: string;
  manaBlack: string;
  manaRed: string;
  manaGreen: string;
  manaColorless: string;
}

/** Typography tokens. */
export interface ThemeTypography {
  fontFamily: string;
  headingFontFamily: string;
  fontWeight: {
    normal: number;
    bold: number;
    heading: number;
  };
}

/** Layout tokens. */
export interface ThemeLayout {
  borderRadius: string;
  borderWidth: string;
  borderStyle: string;
}

/** Card face colors per MTG color identity. */
export interface CardColors {
  white: string;
  blue: string;
  black: string;
  red: string;
  green: string;
  colorless: string;
}

/** 3D scene tokens. */
export interface ThemeScene {
  tableSurface: string;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  cardBack: string;
  cardGlowSelected: string;
  cardGlowHover: string;
  cardGlowNone: string;
  cardHighlight: string;
  zoneLabelColor: string;
  cardColors: CardColors;
  cardTextOnDark: string;
  cardTextOnLight: string;
}

/** Particle effect tokens. */
export interface ThemeParticles {
  damage: string;
  heal: string[];
}

/** Complete theme definition. */
export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  scene: ThemeScene;
  particles: ThemeParticles;
  cssOverrides?: string;
}

/** Shape of the theme context value. */
export interface ThemeContextValue {
  theme: Theme;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
}
