/**
 * Types for 3D game board zones and cards.
 */

import type { GetGameStateResponse, PermanentInfo, CardInfo, StackEntryInfo } from './api';
import type { ThemeScene } from '@/theme';

export interface CardData {
  objectId: number;
  name: string;
  oracleId?: string;
  controller?: string;
  cardType: 'creature' | 'land' | 'instant' | 'sorcery' | 'enchantment' | 'artifact' | 'planeswalker';
  color: 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless';
  power?: number;
  toughness?: number;
  tapped?: boolean;
  manaValue?: number;
  manaCost?: string[];
}

export interface ZoneData {
  hand: CardData[];
  battlefield: CardData[];
  graveyard: CardData[];
  myGraveyard: CardData[];
  opponentGraveyard: CardData[];
  stack: CardData[];
  exile: CardData[];
}

/** Get the card face color for a given MTG color identity from the theme. */
export function getCardColor(color: string, scene: ThemeScene): string {
  return scene.cardColors[color as keyof typeof scene.cardColors] ?? scene.cardColors.colorless;
}

/** Standard MTG card dimensions (ratio 5:7), scaled for scene units. */
export const CARD_WIDTH = 1.56;
export const CARD_HEIGHT = 2.184;
export const CARD_DEPTH = 0.06;

// --- Mapping helpers ---

type CardType = CardData['cardType'];
type CardColor = CardData['color'];

const VALID_CARD_TYPES = new Set<string>([
  'creature', 'land', 'instant', 'sorcery', 'enchantment', 'artifact', 'planeswalker',
]);

function parseCardType(cardTypes: string[]): CardType {
  const normalized = cardTypes[0]?.toLowerCase() ?? '';
  return VALID_CARD_TYPES.has(normalized) ? (normalized as CardType) : 'creature';
}

/** Map a mana cost symbol like "{W}" to a color. */
const MANA_SYMBOL_TO_COLOR: Record<string, CardColor> = {
  W: 'white', U: 'blue', B: 'black', R: 'red', G: 'green',
};

function colorFromManaCost(manaCost?: string[]): CardColor {
  if (!manaCost) return 'colorless';
  for (const symbol of manaCost) {
    // Extract letter from symbols like "{W}", "W", "{2/W}", etc.
    const match = symbol.match(/[WUBRG]/);
    if (match) {
      return MANA_SYMBOL_TO_COLOR[match[0]];
    }
  }
  return 'colorless';
}

function mapPermanent(p: PermanentInfo): CardData {
  return {
    objectId: p.objectId,
    name: p.name,
    oracleId: p.oracleId,
    controller: p.controller,
    cardType: parseCardType(p.cardTypes),
    color: 'colorless',
    power: p.effectivePower ?? p.power,
    toughness: p.effectiveToughness ?? p.toughness,
    tapped: p.tapped,
  };
}

function mapCardInfo(c: CardInfo): CardData {
  return {
    objectId: c.objectId,
    name: c.name,
    oracleId: c.oracleId,
    cardType: parseCardType(c.cardTypes),
    color: colorFromManaCost(c.manaCost),
    manaValue: c.manaValue,
    manaCost: c.manaCost,
  };
}

function mapStackEntry(s: StackEntryInfo): CardData {
  return {
    objectId: s.objectId ?? 0,
    name: s.name,
    oracleId: s.oracleId,
    cardType: 'instant',
    color: 'colorless',
  };
}

/** Convert API game state response into zone data for the 3D board. */
export function mapGameStateToZones(state: GetGameStateResponse, playerId?: string): ZoneData {
  const graveyards = state.graveyards ?? [];
  const myGy = graveyards.find((g) => g.playerId === playerId);
  const oppGy = graveyards.find((g) => g.playerId !== playerId);
  return {
    battlefield: state.battlefield?.map(mapPermanent) ?? [],
    hand: state.hand?.map(mapCardInfo) ?? [],
    graveyard: graveyards.flatMap((entry) => entry.cards.map(mapCardInfo)),
    myGraveyard: myGy?.cards.map(mapCardInfo) ?? [],
    opponentGraveyard: oppGy?.cards.map(mapCardInfo) ?? [],
    stack: state.stack?.map(mapStackEntry) ?? [],
    exile: state.exile?.map(mapCardInfo) ?? [],
  };
}
