import { useNavigate } from 'react-router-dom';
import type { PlayerInfo } from '@/types/models';
import { Button } from '@/components/shared';

interface GameOverOverlayProps {
  players: PlayerInfo[];
}

export function GameOverOverlay({ players }: GameOverOverlayProps) {
  const navigate = useNavigate();
  const winner = players.find((p) => p.lifeTotal > 0);

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', zIndex: 100 }}>
      <h1>Game Over</h1>
      {winner && <p style={{ fontSize: '1.2rem' }}>{winner.name} wins!</p>}
      <Button onClick={() => navigate('/')}>Back to Lobby</Button>
    </div>
  );
}
