import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Select } from '@/components/shared';
import { storage } from '@/services/storage';

const STORAGE_KEY = 'mtg-decklist';

function countCards(text: string): number {
  return text.trim().split('\n').filter(Boolean).reduce((sum, line) => {
    const match = line.match(/^(\d+)\s+/);
    return sum + (match ? parseInt(match[1], 10) : 0);
  }, 0);
}

export function DeckBuilderPage() {
  const [deckText, setDeckText] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [deckName, setDeckName] = useState('');
  const [savedDecks, setSavedDecks] = useState<string[]>([]);
  const [selectedDeck, setSelectedDeck] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, deckText); }, [deckText]);

  const refreshDecks = useCallback(async () => {
    const decks = await storage.listDecks();
    setSavedDecks(decks);
  }, []);

  useEffect(() => { refreshDecks(); }, [refreshDecks]);

  const handleSave = async () => {
    if (!deckName.trim()) return;
    setLoading(true);
    try {
      await storage.saveDeck(deckName.trim(), deckText);
      await refreshDecks();
      setSelectedDeck(deckName.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async () => {
    if (!selectedDeck) return;
    setLoading(true);
    try {
      const content = await storage.loadDeck(selectedDeck);
      if (content !== null) {
        setDeckText(content);
        setDeckName(selectedDeck);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDeck) return;
    setLoading(true);
    try {
      await storage.deleteDeck(selectedDeck);
      if (deckName === selectedDeck) setDeckName('');
      setSelectedDeck('');
      await refreshDecks();
    } finally {
      setLoading(false);
    }
  };

  const deckOptions = [
    { value: '', label: '— Select a deck —' },
    ...savedDecks.map((d) => ({ value: d, label: d })),
  ];

  return (
    <div className="page-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h1>Deck Builder</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>Enter one card per line: "4 Lightning Bolt"</p>
      <Input label="Deck Name" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="My Deck" />
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Select label="Saved Decks" options={deckOptions} value={selectedDeck} onChange={(e) => setSelectedDeck(e.currentTarget.value)} />
        </div>
        <Button variant="secondary" onClick={handleLoad} disabled={loading || !selectedDeck}>Load</Button>
        <Button variant="secondary" onClick={handleDelete} disabled={loading || !selectedDeck}>Delete</Button>
      </div>
      <textarea
        value={deckText}
        onChange={(e) => setDeckText(e.target.value)}
        rows={16}
        placeholder={'4 Lightning Bolt\n20 Mountain'}
        style={{ padding: '12px', borderRadius: 'var(--radius)', border: 'var(--border-width) var(--border-style) var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', resize: 'vertical', fontFamily: 'monospace' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Cards: {countCards(deckText)}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleSave} disabled={loading || !deckName.trim()}>Save Deck</Button>
          <Button variant="secondary" onClick={() => setDeckText('')}>Clear</Button>
        </div>
      </div>
    </div>
  );
}
