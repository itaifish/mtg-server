import { useGameStore } from '@/stores/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { LegalActionType } from '@/types/enums';
import { Button } from '@/components/shared';

export function ManaPanel() {
  const legalActions = useGameStore((s) => s.legalActions);
  const { activateManaAbility, isLoading } = useGameActions();

  const manaAbilities = legalActions.filter(
    (a) => a.actionType === LegalActionType.ACTIVATE_MANA_ABILITY && a.objectId !== undefined,
  );

  if (manaAbilities.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Mana abilities"
      style={{ padding: '12px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}
    >
      <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Mana Abilities
      </h4>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {manaAbilities.map((a) => (
          <Button
            key={a.objectId}
            variant="secondary"
            disabled={isLoading}
            onClick={() => activateManaAbility(a.objectId!, 0)}
            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
          >
            Tap #{a.objectId}
          </Button>
        ))}
      </div>
    </div>
  );
}
