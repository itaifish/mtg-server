import { useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { StackCard } from './StackCard';

export function StackOverlay() {
  const stack = useGameStore((s) => s.gameState?.stack);
  const [expanded, setExpanded] = useState(false);

  if (!stack || stack.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)', padding: '8px', zIndex: 30,
      minWidth: expanded ? '160px' : '120px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>Stack ({stack.length})</span>
        <span style={{ fontSize: '0.65rem' }}>{expanded ? '▾' : '▸'}</span>
      </div>
      {stack.map((entry, i) => (
        expanded ? (
          <StackCard key={entry.objectId ?? i} entry={entry} index={i} total={stack.length} />
        ) : (
          <div key={entry.objectId ?? i} style={{
            background: 'var(--color-bg-secondary)', borderRadius: '4px', padding: '4px 8px',
            marginBottom: i < stack.length - 1 ? '4px' : 0,
            fontSize: '0.75rem', borderLeft: '3px solid var(--color-gold)',
          }}>
            {entry.name}
          </div>
        )
      ))}
    </div>
  );
}
