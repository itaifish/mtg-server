import { useUiStore } from '@/stores/uiStore';
import { useGameActions } from '@/hooks/useGameActions';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/components/shared';
import type { LegalAction, ManaPoolInfo } from '@/types/models';

const MANA_SYMBOLS: [keyof ManaPoolInfo, string][] = [
  ['white', '{W}'], ['blue', '{U}'], ['black', '{B}'],
  ['red', '{R}'], ['green', '{G}'], ['colorless', '{C}'],
];

function manaLabel(a: LegalAction, nameMap: Map<number, string>): string {
  if (a.manaProduced) {
    const colors = MANA_SYMBOLS
      .filter(([k]) => a.manaProduced![k].unrestricted > 0)
      .map(([, sym]) => sym);
    if (colors.length > 0) return colors.join('');
  }
  if (a.description) return a.description;
  const name = a.objectId != null ? nameMap.get(a.objectId) : undefined;
  return name ? `Tap ${name}` : `Ability ${(a.abilityIndex ?? 0) + 1}`;
}

export function ManaAbilityPicker() {
  const picker = useUiStore((s) => s.manaAbilityPicker);
  const setManaAbilityPicker = useUiStore((s) => s.setManaAbilityPicker);
  const { activateManaAbility } = useGameActions();
  const battlefield = useGameStore((s) => s.gameState?.battlefield);

  if (!picker) return null;

  const nameMap = new Map<number, string>();
  battlefield?.forEach((p) => nameMap.set(p.objectId, p.name));
  const permName = nameMap.get(picker.objectId) ?? `#${picker.objectId}`;

  return (
    <div style={{
      position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--color-surface)', border: '1px solid var(--color-gold)',
      borderRadius: 'var(--radius)', padding: '10px 14px', zIndex: 40,
      display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tap {permName} for:</span>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {picker.abilities.map((a, i) => (
          <Button key={i} variant="secondary" style={{ fontSize: '0.8rem', padding: '4px 12px' }}
            onClick={() => { activateManaAbility(picker.objectId, a.abilityIndex ?? i); setManaAbilityPicker(null); }}>
            {manaLabel(a, nameMap)}
          </Button>
        ))}
        <Button variant="secondary" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={() => setManaAbilityPicker(null)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
