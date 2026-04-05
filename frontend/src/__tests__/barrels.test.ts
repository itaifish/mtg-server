import { describe, it, expect } from 'vitest';
import * as storesIndex from '@/stores/index';
import * as typesIndex from '@/types/index';
import * as apiIndex from '@/api/index';

describe('barrel exports', () => {
  it('stores/index re-exports stores', () => {
    expect(storesIndex.useLobbyStore).toBeDefined();
    expect(storesIndex.useGameStore).toBeDefined();
    expect(storesIndex.useUiStore).toBeDefined();
    expect(storesIndex.selectCurrentPhase).toBeDefined();
    expect(storesIndex.selectIsMyTurn).toBeDefined();
    expect(storesIndex.selectMyPlayer).toBeDefined();
    expect(storesIndex.selectOpponentPlayers).toBeDefined();
  });

  it('types/index re-exports types and enums', () => {
    expect(typesIndex.GameFormat).toBeDefined();
    expect(typesIndex.GameStatus).toBeDefined();
    expect(typesIndex.LegalActionType).toBeDefined();
    expect(typesIndex.createPassPriority).toBeDefined();
  });

  it('api/index re-exports client and hooks', () => {
    expect(apiIndex.MtgApiClient).toBeDefined();
    expect(apiIndex.ApiError).toBeDefined();
    expect(apiIndex.ApiClientProvider).toBeDefined();
    expect(apiIndex.useApiClient).toBeDefined();
  });
});
