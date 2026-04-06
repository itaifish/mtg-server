import { useNavigate } from 'react-router-dom';
import type { PlayerInfo } from '@/types/models';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/components/shared';

interface GameOverOverlayProps {
  players: PlayerInfo[];
}

export function GameOverOverlay({ players }: GameOverOverlayProps) {
  const navigate = useNavigate();
  const resetLobby = useLobbyStore((s) => s.reset);
  const resetGame = useGameStore((s) => s.reset);
  const winner = players.find((p) => p.lifeTotal > 0);

  const handleBackToLobby = () => {
    resetLobby();
    resetGame();
    navigate('/');
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--color-overlay, rgba(0,0,0,0.8))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: 100 }}>
      <h1>Game Over</h1>
      {winner && <p style={{ fontSize: '1.2rem' }}>{winner.name} wins!</p>}
      <Button onClick={handleBackToLobby}>Back to Lobby</Button>
    </div>
  );
}
