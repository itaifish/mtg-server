import type { GameStatus, GamePhase } from '@/types/enums';

interface PhaseIndicatorProps {
  currentStatus: GameStatus;
  currentPhase?: GamePhase;
  landsPlayedThisTurn?: number;
}

const pregameLabels: Record<string, string> = {
  WAITING_FOR_PLAYERS: 'Waiting',
  CHOOSING_PLAY_ORDER: 'Play Order',
  MULLIGAN: 'Mulligan',
  FINISHED: 'Finished',
};

const phaseLabels: { key: GamePhase; label: string; short: string }[] = [
  { key: 'UNTAP', label: 'Untap', short: 'UNT' },
  { key: 'UPKEEP', label: 'Upkeep', short: 'UPK' },
  { key: 'DRAW', label: 'Draw', short: 'DRW' },
  { key: 'PRECOMBAT_MAIN', label: 'Main 1', short: 'M1' },
  { key: 'BEGINNING_OF_COMBAT', label: 'Combat', short: 'BOC' },
  { key: 'DECLARE_ATTACKERS', label: 'Attackers', short: 'ATK' },
  { key: 'DECLARE_BLOCKERS', label: 'Blockers', short: 'BLK' },
  { key: 'COMBAT_DAMAGE', label: 'Damage', short: 'DMG' },
  { key: 'END_OF_COMBAT', label: 'End Combat', short: 'EOC' },
  { key: 'POSTCOMBAT_MAIN', label: 'Main 2', short: 'M2' },
  { key: 'END_STEP', label: 'End', short: 'END' },
  { key: 'CLEANUP', label: 'Cleanup', short: 'CLN' },
];

export function PhaseIndicator({ currentStatus, currentPhase, landsPlayedThisTurn }: PhaseIndicatorProps) {
  // Show pregame label if not in progress
  if (currentStatus !== 'IN_PROGRESS') {
    const label = pregameLabels[currentStatus] ?? currentStatus;
    return (
      <div style={{ display: 'flex', gap: '4px', padding: '8px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }} role="status" aria-label={`Game status: ${label}`}>
        <span style={{ padding: '4px 10px', borderRadius: 'var(--radius)', fontSize: '0.75rem', fontWeight: 600, background: 'var(--color-gold)', color: 'var(--color-bg)' }}>
          {label}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '2px', padding: '6px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }} role="status" aria-label={`Current phase: ${currentPhase ?? 'unknown'}`}>
        {phaseLabels.map((p) => {
          const active = p.key === currentPhase;
          return (
            <span key={p.key} title={p.label} style={{
              padding: '3px 6px', borderRadius: 'var(--radius)', fontSize: '0.65rem', fontWeight: 600,
              background: active ? 'var(--color-gold)' : 'transparent',
              color: active ? 'var(--color-bg)' : 'var(--color-text-muted)',
              opacity: active ? 1 : 0.5,
            }}>
              {p.short}
            </span>
          );
        })}
      </div>
      {landsPlayedThisTurn != null && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }} title="Lands played this turn">
          🏔️ {landsPlayedThisTurn}/1
        </span>
      )}
    </div>
  );
}
