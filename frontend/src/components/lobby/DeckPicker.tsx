import { useState, useEffect } from 'react';
import { storage } from '@/services/storage';
import { Select } from '@/components/shared';
import type { DecklistEntry } from '@/types/models';

interface DeckPickerProps {
  onSelect: (decklist: DecklistEntry[], deckText: string) => void;
}

function parseDeckList(text: string): DecklistEntry[] {
  return text.trim().split('\n').filter(Boolean).map((line) => {
    const match = line.match(/^(\d+)\s+(.+)$/);
    return match ? { count: parseInt(match[1], 10), cardName: match[2].trim() } : null;
  }).filter((e): e is DecklistEntry => e !== null);
}

export function DeckPicker({ onSelect }: DeckPickerProps) {
  const [deckNames, setDeckNames] = useState<string[]>([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    storage.listDecks().then(setDeckNames);
  }, []);

  const handleChange = async (name: string) => {
    setSelected(name);
    if (!name) return;
    const content = await storage.loadDeck(name);
    if (content) onSelect(parseDeckList(content), content);
  };

  const options = [
    { value: '', label: '— Select a saved deck —' },
    ...deckNames.map((d) => ({ value: d, label: d })),
  ];

  return <Select label="Deck" options={options} value={selected} onChange={(e) => handleChange(e.target.value)} />;
}
