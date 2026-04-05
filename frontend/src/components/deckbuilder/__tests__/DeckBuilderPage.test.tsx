import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeckBuilderPage } from '../DeckBuilderPage';

// Mock the storage service so tests use a simple in-memory store
const decks = new Map<string, string>();

vi.mock('@/services/storage', () => ({
  storage: {
    saveDeck: vi.fn(async (name: string, content: string) => { decks.set(name, content); }),
    loadDeck: vi.fn(async (name: string) => decks.get(name) ?? null),
    listDecks: vi.fn(async () => [...decks.keys()].sort()),
    deleteDeck: vi.fn(async (name: string) => { decks.delete(name); }),
    saveSettings: vi.fn(),
    loadSettings: vi.fn(async () => null),
  },
}));

describe('DeckBuilderPage', () => {
  beforeEach(() => {
    localStorage.clear();
    decks.clear();
  });

  it('renders heading and textarea', () => {
    render(<DeckBuilderPage />);
    expect(screen.getByText('Deck Builder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/lightning bolt/i)).toBeInTheDocument();
  });

  it('shows card count', async () => {
    const user = userEvent.setup();
    render(<DeckBuilderPage />);
    await user.type(screen.getByPlaceholderText(/lightning bolt/i), '4 Lightning Bolt\n20 Mountain');
    expect(screen.getByText('Cards: 24')).toBeInTheDocument();
  });

  it('saves to localStorage', async () => {
    const user = userEvent.setup();
    render(<DeckBuilderPage />);
    await user.type(screen.getByPlaceholderText(/lightning bolt/i), '4 Bolt');
    expect(localStorage.getItem('mtg-decklist')).toBe('4 Bolt');
  });

  it('loads from localStorage', () => {
    localStorage.setItem('mtg-decklist', '2 Island');
    render(<DeckBuilderPage />);
    expect(screen.getByDisplayValue('2 Island')).toBeInTheDocument();
    expect(screen.getByText('Cards: 2')).toBeInTheDocument();
  });

  it('clears textarea on Clear button', async () => {
    const user = userEvent.setup();
    localStorage.setItem('mtg-decklist', '4 Bolt');
    render(<DeckBuilderPage />);
    await user.click(screen.getByText('Clear'));
    expect(screen.getByText('Cards: 0')).toBeInTheDocument();
  });

  it('renders deck management controls', () => {
    render(<DeckBuilderPage />);
    expect(screen.getByLabelText(/deck name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/saved decks/i)).toBeInTheDocument();
    expect(screen.getByText('Save Deck')).toBeInTheDocument();
    expect(screen.getByText('Load')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('saves and loads a deck via storage service', async () => {
    const user = userEvent.setup();
    render(<DeckBuilderPage />);
    await user.type(screen.getByPlaceholderText(/lightning bolt/i), '4 Bolt');
    await user.type(screen.getByLabelText(/deck name/i), 'Burn');
    await user.click(screen.getByText('Save Deck'));

    const { storage } = await import('@/services/storage');
    expect(storage.saveDeck).toHaveBeenCalledWith('Burn', '4 Bolt');
  });

  it('loads a saved deck into the editor', async () => {
    decks.set('Burn', '4 Lightning Bolt');
    const user = userEvent.setup();
    render(<DeckBuilderPage />);
    const select = screen.getByLabelText(/saved decks/i);
    await waitFor(() => {
      expect(select).toContainHTML('Burn');
    });
    await user.selectOptions(select, 'Burn');
    await user.click(screen.getByText('Load'));
    await waitFor(() => {
      expect(screen.getByDisplayValue('4 Lightning Bolt')).toBeInTheDocument();
    });
  });

  it('deletes a saved deck', async () => {
    decks.set('Burn', '4 Bolt');
    const user = userEvent.setup();
    render(<DeckBuilderPage />);
    const select = screen.getByLabelText(/saved decks/i);
    await waitFor(() => {
      expect(select).toContainHTML('Burn');
    });
    await user.selectOptions(select, 'Burn');
    await user.click(screen.getByText('Delete'));
    const { storage } = await import('@/services/storage');
    expect(storage.deleteDeck).toHaveBeenCalledWith('Burn');
  });

  it('does not save when deck name is empty', async () => {
    render(<DeckBuilderPage />);
    // Save Deck button should be disabled when name is empty
    expect(screen.getByText('Save Deck')).toBeDisabled();
  });
});
