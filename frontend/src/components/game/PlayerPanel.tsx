import type { PlayerInfo } from '@/types/models';
import { useUiStore } from '@/stores/uiStore';

interface PlayerPanelProps {
  player: PlayerInfo;
  isActive: boolean;
}

export function PlayerPanel({ player, isActive }: PlayerPanelProps) {
  const handleClick = () => {
    if (useUiStore.getState().targetingMode) {
      window.dispatchEvent(new CustomEvent('target-selected', { detail: { player: { playerId: player.playerId } } }));
    }
  };

  return (
    <div onClick={handleClick} className="panel player-panel" style={{ padding: '6px 10px', background: 'var(--color-surface)', borderRadius: 'var(--radius)', border: isActive ? '2px solid var(--color-gold)' : 'var(--border-width) var(--border-style) var(--color-border)', cursor: useUiStore.getState().targetingMode ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>{player.name}</span>
        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-gold)' }} aria-label={`Life total: ${player.lifeTotal}`}>{player.lifeTotal}</span>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        <span title="Cards in hand">🃏 {player.handSize}</span>
        <span title="Cards in library">📚 {player.librarySize}</span>
        {player.poisonCounters > 0 && (
          <span title="Poison counters" style={{ color: 'var(--color-danger)' }}>☠️ {player.poisonCounters}</span>
        )}
      </div>
    </div>
  );
}
