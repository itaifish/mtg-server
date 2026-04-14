import { useGameStore } from '@/stores/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { LegalActionType } from '@/types/enums';
import { Button } from '@/components/shared';
import type { LegalAction, ManaPoolInfo } from '@/types/models';

const MANA_SYMBOLS: [keyof ManaPoolInfo, string][] = [
  ['white', '{W}'], ['blue', '{U}'], ['black', '{B}'],
  ['red', '{R}'], ['green', '{G}'], ['colorless', '{C}'],
];

function abilityLabel(a: LegalAction, nameMap: Map<number, string>): string {
  if (a.manaProduced) {
    const colors = MANA_SYMBOLS
      .filter(([k]) => a.manaProduced![k].unrestricted > 0)
      .map(([, sym]) => sym);
    if (colors.length > 0) {
      const name = a.objectId != null ? nameMap.get(a.objectId) : undefined;
      return name ? `${name} ${colors.join('')}` : colors.join('');
    }
  }
  if (a.description) return a.description;
  const name = a.objectId != null ? nameMap.get(a.objectId) : undefined;
  return name ? `Tap ${name}` : `Tap #${a.objectId}`;
}

export function ManaPanel() {
  const legalActions = useGameStore((s) => s.legalActions);
  const battlefield = useGameStore((s) => s.gameState?.battlefield);
  const { activateManaAbility, isLoading } = useGameActions();

  const manaAbilities = legalActions.filter(
    (a) => a.actionType === LegalActionType.ACTIVATE_MANA_ABILITY && a.objectId !== undefined,
  );

  if (manaAbilities.length === 0) return null;

  const nameMap = new Map<number, string>();
  battlefield?.forEach((p) => nameMap.set(p.objectId, p.name));

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
        {manaAbilities.map((a, i) => (
          <Button
            key={`${a.objectId}-${a.abilityIndex ?? i}`}
            variant="secondary"
            disabled={isLoading}
            onClick={() => activateManaAbility(a.objectId!, a.abilityIndex ?? 0)}
            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
          >
            {abilityLabel(a, nameMap)}
          </Button>
        ))}
      </div>
    </div>
  );
}
