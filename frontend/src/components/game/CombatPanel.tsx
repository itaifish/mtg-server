import { useState, useCallback, useMemo, useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useUiStore } from '@/stores/uiStore';
import { useGameActions } from '@/hooks/useGameActions';
import { LegalActionType } from '@/types/enums';
import { Button } from '@/components/shared';
import type { AttackerEntry, BlockerEntry } from '@/types/models';

export function CombatPanel() {
  const legalActions = useGameStore((s) => s.legalActions);
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useLobbyStore((s) => s.playerId) ?? '';
  const players = gameState?.players;
  const opponents = useMemo(() => players?.filter((p) => p.playerId !== playerId) ?? [], [players, playerId]);
  const { declareAttackers, declareBlockers, isLoading } = useGameActions();

  const declaredAttackerIds = useUiStore((s) => s.declaredAttackerIds);
  const setCombatSelection = useUiStore((s) => s.setCombatSelection);
  const clearDeclaredAttackers = useUiStore((s) => s.clearDeclaredAttackers);

  const isAttacking = legalActions.some((a) => a.actionType === LegalActionType.DECLARE_ATTACKERS);
  const isBlocking = legalActions.some((a) => a.actionType === LegalActionType.DECLARE_BLOCKERS);

  const [blockers, setBlockers] = useState<BlockerEntry[]>([]);

  // Eligible attackers: our creatures that are untapped and not summoning sick
  const eligibleAttackers = useMemo(() =>
    (gameState?.battlefield ?? []).filter((p) =>
      p.controller === playerId &&
      p.cardTypes.some((t) => t.toLowerCase() === 'creature') &&
      !p.tapped &&
      !p.summoningSick
    ), [gameState?.battlefield, playerId]);

  // Sync combat mode + eligible attacker IDs to uiStore so Card3D can handle clicks/highlights.
  // This is idempotent and does NOT clear the player's current selection (important across polls).
  useEffect(() => {
    if (isAttacking) {
      setCombatSelection('attackers', new Set(eligibleAttackers.map((p) => p.objectId)));
    }
  }, [isAttacking, eligibleAttackers, setCombatSelection]);

  // Clear declared attackers only when leaving the declare-attackers step entirely.
  useEffect(() => {
    if (!isAttacking) {
      clearDeclaredAttackers();
    }
  }, [isAttacking, clearDeclaredAttackers]);

  // Eligible blockers: our untapped creatures
  const eligibleBlockers = useMemo(() =>
    (gameState?.battlefield ?? []).filter((p) =>
      p.controller === playerId &&
      p.cardTypes.some((t) => t.toLowerCase() === 'creature') &&
      !p.tapped
    ), [gameState?.battlefield, playerId]);

  // Attacking creatures (from combat info), resolved with names from battlefield
  const attackingCreatures = useMemo(() => {
    const combatAttackers = gameState?.combat?.attackers ?? [];
    const bf = gameState?.battlefield ?? [];
    return combatAttackers.map((atk) => {
      const perm = bf.find((p) => p.objectId === atk.objectId);
      return { ...atk, name: perm?.name ?? `Creature #${atk.objectId}` };
    });
  }, [gameState?.combat, gameState?.battlefield]);

  const toggleBlocker = useCallback(
    (objectId: number, blockingId: number) => {
      setBlockers((prev) =>
        prev.some((b) => b.objectId === objectId)
          ? prev.filter((b) => b.objectId !== objectId)
          : [...prev, { objectId, blockingId }],
      );
    },
    [],
  );

  const confirmAttackers = useCallback(() => {
    const defaultTarget = opponents[0]?.playerId ?? '';
    const entries: AttackerEntry[] = Array.from(declaredAttackerIds).map((objectId) => ({
      objectId,
      targetPlayerId: defaultTarget,
    }));
    declareAttackers(entries);
    clearDeclaredAttackers();
  }, [opponents, declaredAttackerIds, declareAttackers, clearDeclaredAttackers]);

  if (!isAttacking && !isBlocking) return null;

  return (
    <div
      role="region"
      aria-label={isAttacking ? 'Declare attackers' : 'Declare blockers'}
      style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>
        {isAttacking ? 'Declare Attackers' : 'Declare Blockers'}
      </h3>

      {isAttacking && (
        <>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 8px', fontSize: '0.85rem' }}>
            {eligibleAttackers.length === 0
              ? 'No eligible attackers.'
              : `Click your creatures to declare them as attackers${opponents.length > 0 ? ` against ${opponents.map((o) => o.name).join(', ')}` : ''}. Attacking creatures are highlighted in red.`}
          </p>
          <Button
            variant="primary"
            disabled={isLoading}
            loading={isLoading}
            onClick={confirmAttackers}
          >
            Confirm Attackers ({declaredAttackerIds.size})
          </Button>
        </>
      )}

      {isBlocking && (
        <>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 8px', fontSize: '0.85rem' }}>
            Assign blockers to attacking creatures.
          </p>
          {eligibleBlockers.map((blocker) => {
            const existing = blockers.find((b) => b.objectId === blocker.objectId);
            return (
              <div key={blocker.objectId} style={{ marginBottom: '6px', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 600 }}>{blocker.name} {blocker.effectivePower ?? blocker.power}/{blocker.effectiveToughness ?? blocker.toughness}</span>
                <span style={{ color: 'var(--color-text-muted)', margin: '0 6px' }}>blocks →</span>
                {attackingCreatures.map((atk) => (
                  <Button
                    key={atk.objectId}
                    variant={existing?.blockingId === atk.objectId ? 'primary' : 'secondary'}
                    onClick={() => toggleBlocker(blocker.objectId, atk.objectId)}
                    style={{ fontSize: '0.75rem', padding: '2px 8px', marginRight: '4px' }}
                  >
                    {atk.name ?? `#${atk.objectId}`}
                  </Button>
                ))}
              </div>
            );
          })}
          {eligibleBlockers.length === 0 && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No eligible blockers</span>
          )}
          <div style={{ marginTop: '8px' }}>
            <Button
              variant="primary"
              disabled={isLoading}
              loading={isLoading}
              onClick={() => { declareBlockers(blockers); setBlockers([]); }}
            >
              Confirm Blockers ({blockers.length})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
