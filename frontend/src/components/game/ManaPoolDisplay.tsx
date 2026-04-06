import type { ManaPoolInfo } from '@/types/models';

export const EMPTY_POOL: ManaPoolInfo = {
  white: { unrestricted: 0 },
  blue: { unrestricted: 0 },
  black: { unrestricted: 0 },
  red: { unrestricted: 0 },
  green: { unrestricted: 0 },
  colorless: { unrestricted: 0 },
};

const MANA_DISPLAY: { key: keyof ManaPoolInfo; symbol: string; color: string; light?: boolean }[] = [
  { key: 'white', symbol: 'W', color: '#f9faf4', light: true },
  { key: 'blue', symbol: 'U', color: '#0e68ab' },
  { key: 'black', symbol: 'B', color: '#150b00' },
  { key: 'red', symbol: 'R', color: '#d3202a' },
  { key: 'green', symbol: 'G', color: '#00733e' },
  { key: 'colorless', symbol: 'C', color: '#ccc2c0', light: true },
];

interface ManaPoolDisplayProps {
  pool: ManaPoolInfo;
  compact?: boolean;
}

export function ManaPoolDisplay({ pool, compact }: ManaPoolDisplayProps) {
  const entries = MANA_DISPLAY.filter(({ key }) => pool[key].unrestricted > 0);

  if (entries.length === 0) {
    return <span style={{ color: 'var(--color-text-muted)', fontSize: compact ? '0.7rem' : '0.8rem' }}>No mana</span>;
  }

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {entries.map(({ key, symbol, color, light }) => {
        const amount = pool[key].unrestricted;
        return (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: color, color: light ? '#000' : '#fff',
            borderRadius: '50%', width: compact ? 20 : 26, height: compact ? 20 : 26,
            fontSize: compact ? '0.65rem' : '0.75rem', fontWeight: 700,
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            {amount > 1 ? amount : symbol}
          </div>
        );
      })}
    </div>
  );
}
