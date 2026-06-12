import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { GameStatus } from '@/types/enums';

const pulseKeyframes = `
@keyframes priority-pulse {
  0%, 100% { box-shadow: 0 0 4px var(--color-gold); }
  50% { box-shadow: 0 0 16px var(--color-gold); }
}
`;

export function PriorityIndicator() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useLobbyStore((s) => s.playerId);

  if (!gameState) return null;

  const hasPriority = gameState.priorityPlayerId === playerId;
  const isActiveTurn = gameState.activePlayerId === playerId;

  let label = '';
  let bg = 'var(--color-surface)';
  let fg = 'var(--color-text-muted)';
  let animate = false;

  const activeBg = () => { bg = 'var(--color-accent, #3388ff)'; fg = '#fff'; animate = true; };
  const waitingBg = () => { bg = 'var(--color-surface)'; fg = 'var(--color-text-muted)'; animate = false; };

  if (gameState.status === GameStatus.CHOOSING_PLAY_ORDER) {
    // The play-order chooser is tracked separately from priority during pregame.
    if (gameState.playOrderChooserId === playerId) {
      label = 'Choose who goes first';
      activeBg();
    } else {
      const chooser = gameState.players.find((p) => p.playerId === gameState.playOrderChooserId);
      label = `Waiting for ${chooser?.name ?? 'opponent'}`;
      waitingBg();
    }
  } else if (gameState.status === GameStatus.MULLIGAN) {
    const me = gameState.players.find((p) => p.playerId === playerId);
    if (me && !me.hasKept) {
      label = 'Mulligan decision';
      activeBg();
    } else {
      label = 'Waiting for opponent';
      waitingBg();
    }
  } else if (isActiveTurn && hasPriority) {
    label = 'Your turn';
    bg = 'var(--color-gold)';
    fg = 'var(--color-bg)';
    animate = true;
  } else if (hasPriority) {
    label = 'You have priority';
    activeBg();
  } else {
    const priorityPlayer = gameState.players.find(
      (p) => p.playerId === gameState.priorityPlayerId,
    );
    label = `Waiting for ${priorityPlayer?.name ?? 'opponent'}`;
    waitingBg();
  }

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
          background: bg,
          color: fg,
          animation: animate ? 'priority-pulse 2s ease-in-out infinite' : 'none',
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
