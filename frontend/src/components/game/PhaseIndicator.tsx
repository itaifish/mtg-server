import type { GameStatus } from '@/types/enums';

interface PhaseIndicatorProps {
  currentStatus: GameStatus;
}

const phases: { key: GameStatus; label: string }[] = [
  { key: 'WAITING_FOR_PLAYERS', label: 'Waiting' },
  { key: 'CHOOSING_PLAY_ORDER', label: 'Play Order' },
  { key: 'MULLIGAN', label: 'Mulligan' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'FINISHED', label: 'Finished' },
];

export function PhaseIndicator({ currentStatus }: PhaseIndicatorProps) {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '8px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }} role="status" aria-label={`Current phase: ${currentStatus}`}>
      {phases.map((p) => (
        <span key={p.key} style={{
          padding: '4px 10px', borderRadius: 'var(--radius)', fontSize: '0.75rem', fontWeight: 600,
          background: p.key === currentStatus ? 'var(--color-gold)' : 'transparent',
          color: p.key === currentStatus ? 'var(--color-bg)' : 'var(--color-text-muted)',
        }}>
          {p.label}
        </span>
      ))}
    </div>
  );
}
