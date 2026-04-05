import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useGameActions } from '@/hooks/useGameActions';
import { GameStatus } from '@/types/enums';
import { Button } from '@/components/shared';

export function PregamePanel() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useLobbyStore((s) => s.playerId);
  const { chooseFirstPlayer, keepHand, mulligan, isLoading } = useGameActions();

  if (!gameState) return null;

  if (gameState.status === GameStatus.CHOOSING_PLAY_ORDER) {
    const isChooser = gameState.playOrderChooserId === playerId;
    return (
      <div
        role="region"
        aria-label="Choose play order"
        style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Choose Who Goes First</h3>
        {isChooser ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {gameState.players.map((p) => (
              <Button
                key={p.playerId}
                variant="secondary"
                disabled={isLoading}
                loading={isLoading}
                onClick={() => chooseFirstPlayer(p.playerId)}
              >
                {p.name}
              </Button>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Waiting for opponent to choose…
          </p>
        )}
      </div>
    );
  }

  if (gameState.status === GameStatus.MULLIGAN) {
    return (
      <div
        role="region"
        aria-label="Mulligan decision"
        style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>Opening Hand</h3>
        <p style={{ color: 'var(--color-text-muted)', margin: '0 0 12px', fontSize: '0.85rem' }}>
          Turn {gameState.turnNumber} — Review your hand
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" disabled={isLoading} loading={isLoading} onClick={() => keepHand()}>
            Keep
          </Button>
          <Button variant="secondary" disabled={isLoading} loading={isLoading} onClick={() => mulligan()}>
            Mulligan
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
