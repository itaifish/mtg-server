export const GameFormat = {
  STANDARD: 'STANDARD',
  MODERN: 'MODERN',
  LEGACY: 'LEGACY',
  VINTAGE: 'VINTAGE',
  COMMANDER: 'COMMANDER',
  PIONEER: 'PIONEER',
  PAUPER: 'PAUPER',
  DRAFT: 'DRAFT',
} as const;
export type GameFormat = (typeof GameFormat)[keyof typeof GameFormat];

export const GameStatus = {
  WAITING_FOR_PLAYERS: 'WAITING_FOR_PLAYERS',
  CHOOSING_PLAY_ORDER: 'CHOOSING_PLAY_ORDER',
  MULLIGAN: 'MULLIGAN',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
} as const;
export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

export const GamePhase = {
  UNTAP: 'UNTAP',
  UPKEEP: 'UPKEEP',
  DRAW: 'DRAW',
  PRECOMBAT_MAIN: 'PRECOMBAT_MAIN',
  BEGINNING_OF_COMBAT: 'BEGINNING_OF_COMBAT',
  DECLARE_ATTACKERS: 'DECLARE_ATTACKERS',
  DECLARE_BLOCKERS: 'DECLARE_BLOCKERS',
  COMBAT_DAMAGE: 'COMBAT_DAMAGE',
  END_OF_COMBAT: 'END_OF_COMBAT',
  POSTCOMBAT_MAIN: 'POSTCOMBAT_MAIN',
  END_STEP: 'END_STEP',
  CLEANUP: 'CLEANUP',
} as const;
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase];

export const ManaType = {
  WHITE: 'WHITE',
  BLUE: 'BLUE',
  BLACK: 'BLACK',
  RED: 'RED',
  GREEN: 'GREEN',
  COLORLESS: 'COLORLESS',
} as const;
export type ManaType = (typeof ManaType)[keyof typeof ManaType];

export const LegalActionType = {
  PASS_PRIORITY: 'PASS_PRIORITY',
  PLAY_LAND: 'PLAY_LAND',
  CAST_SPELL: 'CAST_SPELL',
  ACTIVATE_MANA_ABILITY: 'ACTIVATE_MANA_ABILITY',
  DECLARE_ATTACKERS: 'DECLARE_ATTACKERS',
  DECLARE_BLOCKERS: 'DECLARE_BLOCKERS',
  CHOOSE_FIRST_PLAYER: 'CHOOSE_FIRST_PLAYER',
  KEEP_HAND: 'KEEP_HAND',
  MULLIGAN: 'MULLIGAN',
  CONCEDE: 'CONCEDE',
} as const;
export type LegalActionType =
  (typeof LegalActionType)[keyof typeof LegalActionType];

export const TargetKind = {
  PLAYER: 'PLAYER',
  CREATURE: 'CREATURE',
  PLANESWALKER: 'PLANESWALKER',
  ARTIFACT: 'ARTIFACT',
  ENCHANTMENT: 'ENCHANTMENT',
  LAND: 'LAND',
  PERMANENT: 'PERMANENT',
  SPELL: 'SPELL',
} as const;
export type TargetKind = (typeof TargetKind)[keyof typeof TargetKind];

export const AutoPassMode = {
  NONE: 'NONE',
  UNTIL_PHASE: 'UNTIL_PHASE',
  UNTIL_STACK_OR_TURN: 'UNTIL_STACK_OR_TURN',
} as const;
export type AutoPassMode = (typeof AutoPassMode)[keyof typeof AutoPassMode];
