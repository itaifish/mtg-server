import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '@/api/hooks';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useGameStore } from '@/stores/gameStore';
import { Button, ErrorBanner, LoadingSpinner } from '@/components/shared';

export function WaitingRoom() {
  const client = useApiClient();
  const { gameId, playerId, error, clearError } = useLobbyStore();
  const { gameState, fetchGameState } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!gameId) return;
    const id = window.setInterval(() => fetchGameState(client, gameId, playerId ?? undefined), 2000);
    fetchGameState(client, gameId, playerId ?? undefined);
    return () => window.clearInterval(id);
  }, [client, gameId, playerId, fetchGameState]);

  useEffect(() => {
    if (gameState && gameState.status !== 'WAITING_FOR_PLAYERS' && gameId) {
      navigate(`/game/${gameId}`);
    }
  }, [gameState, gameId, navigate]);

  if (!gameId) return null;

  const handleReady = () => {
    useLobbyStore.getState().setReady(client, true);
  };

  const handleLeave = () => {
    useLobbyStore.getState().leaveGame(client);
  };

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>Waiting Room</h2>
      {error && <ErrorBanner message={error} onDismiss={clearError} />}
      <p style={{ color: 'var(--color-text-muted)' }}>Game ID: {gameId}</p>
      {gameState ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {gameState.players.map((p) => (
            <div key={p.playerId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}>
              <span>{p.name}</span>
              <span style={{ color: p.ready ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{p.ready ? '✓ Ready' : 'Not Ready'}</span>
            </div>
          ))}
        </div>
      ) : (
        <LoadingSpinner />
      )}
      <div style={{ display: 'flex', gap: '12px' }}>
        <Button onClick={handleReady}>Ready</Button>
        <Button variant="danger" onClick={handleLeave}>Leave Game</Button>
      </div>
    </div>
  );
}
