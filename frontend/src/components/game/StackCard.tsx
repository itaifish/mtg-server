import { useCardImage } from '@/hooks/useCardImage';
import { useUiStore } from '@/stores/uiStore';
import type { StackEntryInfo } from '@/types/api';

interface StackCardProps {
  entry: StackEntryInfo;
  index: number;
  total: number;
}

export function StackCard({ entry, index, total }: StackCardProps) {
  const imageUrl = useCardImage(entry.oracleId);
  const selectObject = useUiStore((s) => s.selectObject);

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
        <img src={imageUrl} alt={entry.name} style={{ width: '40px', borderRadius: '3px', flexShrink: 0 }} />
      ) : (
        <div style={{ width: '40px', height: '56px', borderRadius: '3px', background: 'var(--color-surface)', flexShrink: 0 }} />
      )}
      <div style={{ fontSize: '0.7rem', fontWeight: 600, lineHeight: 1.2 }}>
        {entry.name}
      </div>
    </div>
  );
}
