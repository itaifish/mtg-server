import type { PlayerInfo } from '@/types/models';

interface PlayerPanelProps {
  player: PlayerInfo;
  isActive: boolean;
}

const manaColors: Record<string, string> = {
  WHITE: 'var(--color-white-mana)',
  BLUE: 'var(--color-blue-mana)',
  BLACK: 'var(--color-black-mana)',
  RED: 'var(--color-red-mana)',
  GREEN: 'var(--color-green-mana)',
  COLORLESS: 'var(--color-colorless-mana)',
};

export function PlayerPanel({ player, isActive }: PlayerPanelProps) {
  return (
    <div style={{ padding: '12px', background: 'var(--color-surface)', borderRadius: 'var(--radius)', border: isActive ? '2px solid var(--color-gold)' : '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>{player.name}</span>
        <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-gold)' }} aria-label={`Life total: ${player.lifeTotal}`}>{player.lifeTotal}</span>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }} aria-label="Mana pool">
        {Object.entries(manaColors).map(([type, color]) => (
          <div key={type} title={type} style={{ width: '16px', height: '16px', borderRadius: '50%', background: color, border: '1px solid rgba(255,255,255,0.2)' }} />
        ))}
      </div>
    </div>
  );
}
