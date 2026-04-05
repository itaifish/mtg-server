import { useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { useGameActions } from '@/hooks/useGameActions';
import { LegalActionType } from '@/types/enums';
import { Button } from '@/components/shared';
import type { SymbolPaymentEntry } from '@/types/models';

export function SpellCastPanel() {
  const legalActions = useGameStore((s) => s.legalActions);
  const selectedObjectId = useUiStore((s) => s.selectedObjectId);
  const targetingMode = useUiStore((s) => s.targetingMode);
  const exitTargetingMode = useUiStore((s) => s.exitTargetingMode);
  const { castSpell, isLoading } = useGameActions();
  const [manaPayment] = useState<SymbolPaymentEntry[]>([]);

  const castableSpells = legalActions.filter(
    (a) => a.actionType === LegalActionType.CAST_SPELL && a.objectId !== undefined,
  );

  const selectedSpell = castableSpells.find((a) => a.objectId === selectedObjectId);

  if (castableSpells.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Cast spell"
      style={{ padding: '12px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}
    >
      <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Castable Spells
      </h4>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
        {castableSpells.map((a) => (
          <Button
            key={a.objectId}
            variant={a.objectId === selectedObjectId ? 'primary' : 'secondary'}
            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
            onClick={() => useUiStore.getState().selectObject(a.objectId!)}
          >
            Spell #{a.objectId}
          </Button>
        ))}
      </div>

      {selectedSpell && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {targetingMode && (
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Targets: {targetingMode.selectedTargets.length}/{targetingMode.requiredTargets}
            </span>
          )}
          <Button
            variant="primary"
            disabled={isLoading}
            loading={isLoading}
            onClick={() => {
              castSpell(
                selectedSpell.objectId!,
                manaPayment,
                targetingMode?.selectedTargets,
              );
              exitTargetingMode();
            }}
          >
            Cast
          </Button>
          <Button variant="secondary" onClick={() => { useUiStore.getState().deselectObject(); exitTargetingMode(); }}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
