import { useCardImage } from '@/hooks/useCardImage';
import { useUiStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import type { StackEntryInfo } from '@/types/api';

interface StackCardProps {
  entry: StackEntryInfo;
  index: number;
  total: number;
}

export function StackCard({ entry, index, total }: StackCardProps) {
  const imageUrl = useCardImage(entry.oracleId);
  const selectObject = useUiStore((s) => s.selectObject);
  const gameState = useGameStore((s) => s.gameState);

  const targetNames = (entry.targets ?? []).map((t) => {
    if ('player' in t) {
      const p = gameState?.players.find((pl) => pl.playerId === t.player.playerId);
      return p?.name ?? 'Player';
    }
    const perm = gameState?.battlefield?.find((b) => b.objectId === t.object.objectId);
    return perm?.name ?? `#${t.object.objectId}`;
  });

  return (
    <div
      onClick={() => entry.objectId != null && selectObject(entry.objectId)}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        marginBottom: index < total - 1 ? '4px' : 0,
        borderRadius: '4px', padding: '4px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-secondary)',
        cursor: 'pointer',
      }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={entry.name} style={{ width: '50px', borderRadius: '3px', flexShrink: 0 }} />
      ) : (
        <div style={{ width: '50px', height: '70px', borderRadius: '3px', background: 'var(--color-surface)', flexShrink: 0 }} />
      )}
      <div style={{ fontSize: '0.7rem', lineHeight: 1.3 }}>
        <div style={{ fontWeight: 600 }}>{entry.name}</div>
        {entry.abilityText && (
          <div style={{ color: 'var(--color-text-muted)', marginTop: '2px', fontStyle: 'italic' }}>{entry.abilityText}</div>
        )}
        {targetNames.length > 0 && (
          <div style={{ color: 'var(--color-gold)', marginTop: '2px' }}>
            → {targetNames.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
