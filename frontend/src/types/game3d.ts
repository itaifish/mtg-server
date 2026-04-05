/**
 * Placeholder types for 3D game board zones and cards.
 * These will be replaced once the API provides per-card zone data.
 */

export interface CardData {
  objectId: number;
  name: string;
  cardType: 'creature' | 'land' | 'instant' | 'sorcery' | 'enchantment' | 'artifact' | 'planeswalker';
  color: 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless';
  power?: number;
  toughness?: number;
  tapped?: boolean;
}

export interface ZoneData {
  hand: CardData[];
  battlefield: CardData[];
  graveyard: CardData[];
  stack: CardData[];
  exile: CardData[];
}

/** Placeholder zone data for development until the API provides real data. */
export const PLACEHOLDER_ZONES: ZoneData = {
  hand: [
    { objectId: 1, name: 'Lightning Bolt', cardType: 'instant', color: 'red' },
    { objectId: 2, name: 'Llanowar Elves', cardType: 'creature', color: 'green', power: 1, toughness: 1 },
    { objectId: 3, name: 'Counterspell', cardType: 'instant', color: 'blue' },
    { objectId: 4, name: 'Swords to Plowshares', cardType: 'instant', color: 'white' },
    { objectId: 5, name: 'Dark Ritual', cardType: 'instant', color: 'black' },
  ],
  battlefield: [
    { objectId: 10, name: 'Grizzly Bears', cardType: 'creature', color: 'green', power: 2, toughness: 2 },
    { objectId: 11, name: 'Serra Angel', cardType: 'creature', color: 'white', power: 4, toughness: 4, tapped: true },
    { objectId: 12, name: 'Forest', cardType: 'land', color: 'green' },
    { objectId: 13, name: 'Plains', cardType: 'land', color: 'white' },
    { objectId: 14, name: 'Island', cardType: 'land', color: 'blue' },
  ],
  graveyard: [
    { objectId: 20, name: 'Shock', cardType: 'instant', color: 'red' },
    { objectId: 21, name: 'Giant Growth', cardType: 'instant', color: 'green' },
  ],
  stack: [
    { objectId: 30, name: 'Cancel', cardType: 'instant', color: 'blue' },
  ],
  exile: [
    { objectId: 40, name: 'Path to Exile', cardType: 'instant', color: 'white' },
  ],
};

/** Map card colors to hex values for placeholder rendering. */
export const COLOR_MAP: Record<CardData['color'], string> = {
  white: '#f9faf4',
  blue: '#0e68ab',
  black: '#150b00',
  red: '#d3202a',
  green: '#00733e',
  colorless: '#beb9b2',
};

/** Card back color. */
export const CARD_BACK_COLOR = '#6b3a2a';

/** Standard MTG card dimensions (ratio 5:7), scaled for scene units. */
export const CARD_WIDTH = 1;
export const CARD_HEIGHT = 1.4;
export const CARD_DEPTH = 0.02;
