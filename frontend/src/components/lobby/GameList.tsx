import type { GameSummary } from '@/stores/lobbyStore';
import { Button } from '@/components/shared';

interface GameListProps {
  games: GameSummary[];
  onJoin: (gameId: string) => void;
}

const rowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px', background: 'var(--color-surface)', borderRadius: 'var(--radius)',
};

export function GameList({ games, onJoin }: GameListProps) {
  if (games.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)' }}>No games available. Create one!</p>;
  }
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {games.map((g) => (
        <div key={g.gameId} className="card" style={rowStyle}>
          <div>
            <span style={{ fontWeight: 600 }}>{g.format}</span>
            <span style={{ color: 'var(--color-text-muted)', marginLeft: '12px' }}>{g.playerCount} player(s) · {g.status}</span>
          </div>
          {g.status === 'WAITING_FOR_PLAYERS' && (
            <Button variant="secondary" onClick={() => onJoin(g.gameId)}>Join</Button>
          )}
        </div>
      ))}
    </div>
  );
}
