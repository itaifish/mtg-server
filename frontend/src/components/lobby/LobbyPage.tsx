import { useState } from 'react';
import { useLobbyStore } from '@/stores/lobbyStore';
import { APP_NAME } from '@/constants';
import { ErrorBanner } from '@/components/shared';
import { CreateGameForm } from './CreateGameForm';
import { GameList } from './GameList';
import { JoinGameDialog } from './JoinGameDialog';
import { WaitingRoom } from './WaitingRoom';

export function LobbyPage() {
  const { gameId, games, error, clearError } = useLobbyStore();
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);

  if (gameId) return <WaitingRoom />;

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1>{APP_NAME} Lobby</h1>
      {error && <ErrorBanner message={error} onDismiss={clearError} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <CreateGameForm />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3>Available Games</h3>
          <GameList games={games} onJoin={setJoiningGameId} />
        </div>
      </div>
      {joiningGameId && <JoinGameDialog gameId={joiningGameId} onClose={() => setJoiningGameId(null)} />}
    </div>
  );
}
