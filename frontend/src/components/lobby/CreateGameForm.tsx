import { useState, type FormEvent } from 'react';
import { GameFormat } from '@/types/enums';
import type { DecklistEntry } from '@/types/models';
import { useApiClient } from '@/api/hooks';
import { useLobbyStore } from '@/stores/lobbyStore';
import { Button, Input, Select } from '@/components/shared';

const formatOptions = Object.values(GameFormat).map((f) => ({ value: f, label: f }));

function parseDeckList(text: string): DecklistEntry[] {
  return text.trim().split('\n').filter(Boolean).map((line) => {
    const match = line.match(/^(\d+)\s+(.+)$/);
    return match ? { count: parseInt(match[1], 10), cardName: match[2].trim() } : null;
  }).filter((e): e is DecklistEntry => e !== null);
}

export function CreateGameForm() {
  const client = useApiClient();
  const { createGame, isCreating, playerName, setPlayerName } = useLobbyStore();
  const [format, setFormat] = useState<GameFormat>(GameFormat.STANDARD);
  const [deckText, setDeckText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) { setError('Player name is required'); return; }
    const decklist = parseDeckList(deckText);
    if (decklist.length === 0) { setError('Decklist must have at least one card'); return; }
    setError('');
    createGame(client, format, playerName.trim(), decklist);
  };

  return (
    <form onSubmit={handleSubmit} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3>Create Game</h3>
      <Input label="Player Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your name" />
      <Select label="Format" options={formatOptions} value={format} onChange={(e) => setFormat(e.target.value as GameFormat)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label htmlFor="decklist" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Decklist</label>
        <textarea
          id="decklist"
          value={deckText}
          onChange={(e) => setDeckText(e.target.value)}
          placeholder={'4 Lightning Bolt\n4 Mountain'}
          rows={6}
          style={{ padding: '8px 12px', borderRadius: 'var(--radius)', border: 'var(--border-width) var(--border-style) var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', resize: 'vertical' }}
        />
      </div>
      {error && <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }} role="alert">{error}</span>}
      <Button type="submit" loading={isCreating}>Create Game</Button>
    </form>
  );
}
