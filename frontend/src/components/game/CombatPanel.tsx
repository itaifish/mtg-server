import { useState, useCallback, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useGameActions } from '@/hooks/useGameActions';
import { LegalActionType } from '@/types/enums';
import { Button } from '@/components/shared';
import type { AttackerEntry, BlockerEntry } from '@/types/models';

export function CombatPanel() {
  const legalActions = useGameStore((s) => s.legalActions);
  const playerId = useLobbyStore((s) => s.playerId) ?? '';
  const players = useGameStore((s) => s.gameState?.players);
  const opponents = useMemo(() => players?.filter((p) => p.playerId !== playerId) ?? [], [players, playerId]);
  const { declareAttackers, declareBlockers, isLoading } = useGameActions();

  const isAttacking = legalActions.some((a) => a.actionType === LegalActionType.DECLARE_ATTACKERS);
  const isBlocking = legalActions.some((a) => a.actionType === LegalActionType.DECLARE_BLOCKERS);

  const [attackers, setAttackers] = useState<AttackerEntry[]>([]);
  const [blockers, setBlockers] = useState<BlockerEntry[]>([]);

  const toggleAttacker = useCallback(
    (objectId: number, targetPlayerId: string) => {
      setAttackers((prev) =>
        prev.some((a) => a.objectId === objectId)
          ? prev.filter((a) => a.objectId !== objectId)
          : [...prev, { objectId, targetPlayerId }],
      );
    },
    [],
  );

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

  if (!isAttacking && !isBlocking) return null;

  const defaultTarget = opponents[0]?.playerId ?? '';

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
            Select creatures to attack. Target: {opponents.map((o) => o.name).join(', ') || 'opponent'}
          </p>
          {legalActions
            .filter((a) => a.actionType === LegalActionType.DECLARE_ATTACKERS && a.objectId !== undefined)
            .map((a) => (
              <Button
                key={a.objectId}
                variant={attackers.some((atk) => atk.objectId === a.objectId) ? 'primary' : 'secondary'}
                style={{ margin: '0 4px 4px 0' }}
                onClick={() => toggleAttacker(a.objectId!, defaultTarget)}
              >
                Creature #{a.objectId}
              </Button>
            ))}
          <div style={{ marginTop: '12px' }}>
            <Button
              variant="primary"
              disabled={isLoading}
              loading={isLoading}
              onClick={() => declareAttackers(attackers)}
            >
              Confirm Attackers ({attackers.length})
            </Button>
          </div>
        </>
      )}

      {isBlocking && (
        <>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 8px', fontSize: '0.85rem' }}>
            Assign blockers to attacking creatures.
          </p>
          {legalActions
            .filter((a) => a.actionType === LegalActionType.DECLARE_BLOCKERS && a.objectId !== undefined)
            .map((a) => (
              <Button
                key={a.objectId}
                variant={blockers.some((b) => b.objectId === a.objectId) ? 'primary' : 'secondary'}
                style={{ margin: '0 4px 4px 0' }}
                onClick={() => toggleBlocker(a.objectId!, attackers[0]?.objectId ?? 0)}
              >
                Creature #{a.objectId}
              </Button>
            ))}
          <div style={{ marginTop: '12px' }}>
            <Button
              variant="primary"
              disabled={isLoading}
              loading={isLoading}
              onClick={() => declareBlockers(blockers)}
            >
              Confirm Blockers ({blockers.length})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
