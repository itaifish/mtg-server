import { useState, type FormEvent } from 'react';
import type { DecklistEntry } from '@/types/models';
import { useApiClient } from '@/api/hooks';
import { useLobbyStore } from '@/stores/lobbyStore';
import { Modal, Input, Button } from '@/components/shared';

interface JoinGameDialogProps {
  gameId: string;
  onClose: () => void;
}

function parseDeckList(text: string): DecklistEntry[] {
  return text.trim().split('\n').filter(Boolean).map((line) => {
    const match = line.match(/^(\d+)\s+(.+)$/);
    return match ? { count: parseInt(match[1], 10), cardName: match[2].trim() } : null;
  }).filter((e): e is DecklistEntry => e !== null);
}

export function JoinGameDialog({ gameId, onClose }: JoinGameDialogProps) {
  const client = useApiClient();
  const { joinGame, isJoining, playerName, setPlayerName } = useLobbyStore();
  const [deckText, setDeckText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) { setError('Player name is required'); return; }
    const decklist = parseDeckList(deckText);
    if (decklist.length === 0) { setError('Decklist must have at least one card'); return; }
    setError('');
    joinGame(client, gameId, playerName.trim(), decklist);
  };

  return (
    <Modal title="Join Game" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input label="Player Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="join-decklist" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Decklist</label>
          <textarea id="join-decklist" value={deckText} onChange={(e) => setDeckText(e.target.value)} placeholder={'4 Lightning Bolt\n4 Mountain'} rows={6}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: 'var(--border-width) var(--border-style) var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', resize: 'vertical' }} />
        </div>
        {error && <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }} role="alert">{error}</span>}
        <Button type="submit" loading={isJoining}>Join</Button>
      </form>
    </Modal>
  );
}
