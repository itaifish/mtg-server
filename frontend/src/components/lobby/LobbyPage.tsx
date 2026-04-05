import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useApiClient } from '@/api/hooks';
import { GameStatus } from '@/types/enums';
import { APP_NAME } from '@/constants';
import { ErrorBanner, Input, Select, Button } from '@/components/shared';
import { CreateGameForm } from './CreateGameForm';
import { GameList } from './GameList';
import { JoinGameDialog } from './JoinGameDialog';
import { WaitingRoom } from './WaitingRoom';

const PAGE_SIZE = 10;

const statusOptions = [
  { value: '', label: 'All Statuses' },
  ...Object.values(GameStatus).map((s) => ({ value: s, label: s.replace(/_/g, ' ') })),
];

export function LobbyPage() {
  const { gameId, games, error, clearError, fetchGames } = useLobbyStore();
  const client = useApiClient();
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);

  // Reset to page 0 when filters change
  useEffect(() => { setOffset(0); }, [search, status]);

  const params = useMemo(() => ({
    ...(search && { search }),
    ...(status && { status: status as GameStatus }),
    limit: PAGE_SIZE,
    offset,
  }), [search, status, offset]);

  const poll = useCallback(() => fetchGames(client, params), [client, fetchGames, params]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [poll]);

  if (gameId) return <WaitingRoom />;

  const hasMore = games.length >= PAGE_SIZE;

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1>{APP_NAME} Lobby</h1>
      {error && <ErrorBanner message={error} onDismiss={clearError} />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <CreateGameForm />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3>Available Games</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <Input placeholder="Search games..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div style={{ width: '180px' }}>
              <Select options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} />
            </div>
          </div>
          <GameList games={games} onJoin={setJoiningGameId} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
              ← Prev
            </Button>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Page {Math.floor(offset / PAGE_SIZE) + 1}
            </span>
            <Button variant="secondary" disabled={!hasMore} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
              Next →
            </Button>
          </div>
        </div>
      </div>
      {joiningGameId && <JoinGameDialog gameId={joiningGameId} onClose={() => setJoiningGameId(null)} />}
    </div>
  );
}
