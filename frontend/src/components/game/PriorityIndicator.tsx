import { useGameStore, selectIsMyTurn } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';

const pulseKeyframes = `
@keyframes priority-pulse {
  0%, 100% { box-shadow: 0 0 4px var(--color-gold); }
  50% { box-shadow: 0 0 16px var(--color-gold); }
}
`;

export function PriorityIndicator() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useLobbyStore((s) => s.playerId);
  const isMyTurn = useGameStore((s) => selectIsMyTurn(s, playerId ?? ''));

  if (!gameState) return null;

  const priorityPlayer = gameState.players.find(
    (p) => p.playerId === gameState.priorityPlayerId,
  );
  const label = isMyTurn
    ? 'Your turn'
    : `Waiting for ${priorityPlayer?.name ?? 'opponent'}`;

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div
        role="status"
        aria-label={label}
        style={{
          padding: '8px 16px',
          borderRadius: 'var(--radius)',
          fontWeight: 600,
          fontSize: '0.85rem',
          background: isMyTurn ? 'var(--color-gold)' : 'var(--color-surface)',
          color: isMyTurn ? '#1a1a2e' : 'var(--color-text-muted)',
          animation: isMyTurn ? 'priority-pulse 2s ease-in-out infinite' : 'none',
          textAlign: 'center',
        }}
      >
        {label}
        <span style={{ display: 'block', fontSize: '0.7rem', marginTop: '2px', opacity: 0.8 }}>
          {gameState.status}
        </span>
      </div>
    </>
  );
}
