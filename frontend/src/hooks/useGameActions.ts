import { useCallback, useState } from 'react';
import { useApiClient } from '@/api/hooks';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import {
  createPassPriority,
  createPlayLand,
  createCastSpell,
  createActivateManaAbility,
  createDeclareAttackers,
  createDeclareBlockers,
  createChooseFirstPlayer,
  createKeepHand,
  createMulligan,
  createConcede,
} from '@/types/actions';
import type { SpellTarget } from '@/types/actions';
import type { AttackerEntry, BlockerEntry, SymbolPaymentEntry } from '@/types/models';

interface UseGameActionsReturn {
  isLoading: boolean;
  error: string | null;
  passPriority: () => Promise<void>;
  playLand: (objectId: number) => Promise<void>;
  castSpell: (objectId: number, manaPayment: SymbolPaymentEntry[], targets?: SpellTarget[]) => Promise<void>;
  activateManaAbility: (objectId: number, abilityIndex: number) => Promise<void>;
  declareAttackers: (attackers: AttackerEntry[]) => Promise<void>;
  declareBlockers: (blockers: BlockerEntry[]) => Promise<void>;
  chooseFirstPlayer: (playerId: string) => Promise<void>;
  keepHand: (cardsToBottom?: number[]) => Promise<void>;
  mulligan: () => Promise<void>;
  concede: () => Promise<void>;
}

export function useGameActions(): UseGameActionsReturn {
  const client = useApiClient();
  const submitAction = useGameStore((s) => s.submitAction);
  const gameId = useLobbyStore((s) => s.gameId);
  const playerId = useLobbyStore((s) => s.playerId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (actionCreator: () => ReturnType<typeof createPassPriority>) => {
      if (!gameId || !playerId) return;
      setIsLoading(true);
      setError(null);
      try {
        await submitAction(client, gameId, playerId, actionCreator());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Action failed');
      } finally {
        setIsLoading(false);
      }
    },
    [client, gameId, playerId, submitAction],
  );

  return {
    isLoading,
    error,
    passPriority: useCallback(() => submit(createPassPriority), [submit]),
    playLand: useCallback((objectId: number) => submit(() => createPlayLand(objectId)), [submit]),
    castSpell: useCallback(
      (objectId: number, manaPayment: SymbolPaymentEntry[], targets?: SpellTarget[]) =>
        submit(() => createCastSpell(objectId, manaPayment, targets)),
      [submit],
    ),
    activateManaAbility: useCallback(
      (objectId: number, abilityIndex: number) =>
        submit(() => createActivateManaAbility(objectId, abilityIndex)),
      [submit],
    ),
    declareAttackers: useCallback(
      (attackers: AttackerEntry[]) => submit(() => createDeclareAttackers(attackers)),
      [submit],
    ),
    declareBlockers: useCallback(
      (blockers: BlockerEntry[]) => submit(() => createDeclareBlockers(blockers)),
      [submit],
    ),
    chooseFirstPlayer: useCallback(
      (pid: string) => submit(() => createChooseFirstPlayer(pid)),
      [submit],
    ),
    keepHand: useCallback(
      (cardsToBottom?: number[]) => submit(() => createKeepHand(cardsToBottom)),
      [submit],
    ),
    mulligan: useCallback(() => submit(createMulligan), [submit]),
    concede: useCallback(() => submit(createConcede), [submit]),
  };
}
