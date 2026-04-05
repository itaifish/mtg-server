import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebStorageService, TauriStorageService, isTauri, createStorageService } from '../storage';

describe('isTauri', () => {
  it('returns false when __TAURI_INTERNALS__ is absent', () => {
    expect(isTauri()).toBe(false);
  });

  it('returns true when __TAURI_INTERNALS__ is present', () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });
    try {
      expect(isTauri()).toBe(true);
    } finally {
      delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    }
  });
});

describe('createStorageService', () => {
  it('returns WebStorageService when not in Tauri', () => {
    const svc = createStorageService();
    expect(svc).toBeInstanceOf(WebStorageService);
  });
});

describe('WebStorageService', () => {
  let svc: WebStorageService;

  beforeEach(() => {
    localStorage.clear();
    svc = new WebStorageService();
  });

  describe('saveDeck / loadDeck', () => {
    it('saves and loads a deck', async () => {
      await svc.saveDeck('burn', '4 Lightning Bolt');
      expect(await svc.loadDeck('burn')).toBe('4 Lightning Bolt');
    });

    it('returns null for missing deck', async () => {
      expect(await svc.loadDeck('nonexistent')).toBeNull();
    });
  });

  describe('listDecks', () => {
    it('returns empty array when no decks', async () => {
      expect(await svc.listDecks()).toEqual([]);
    });

    it('lists saved deck names sorted', async () => {
      await svc.saveDeck('zoo', 'cards');
      await svc.saveDeck('burn', 'cards');
      expect(await svc.listDecks()).toEqual(['burn', 'zoo']);
    });

    it('ignores non-deck keys', async () => {
      localStorage.setItem('other-key', 'value');
      await svc.saveDeck('burn', 'cards');
      expect(await svc.listDecks()).toEqual(['burn']);
    });
  });

  describe('deleteDeck', () => {
    it('removes a saved deck', async () => {
      await svc.saveDeck('burn', 'cards');
      await svc.deleteDeck('burn');
      expect(await svc.loadDeck('burn')).toBeNull();
      expect(await svc.listDecks()).toEqual([]);
    });
  });

  describe('saveSettings / loadSettings', () => {
    it('saves and loads settings', async () => {
      const json = JSON.stringify({ serverUrl: 'http://test.com' });
      await svc.saveSettings(json);
      expect(await svc.loadSettings()).toBe(json);
    });

    it('returns null when no settings saved', async () => {
      expect(await svc.loadSettings()).toBeNull();
    });
  });
});

describe('TauriStorageService', () => {
  const mockInvoke = vi.fn();
  let svc: TauriStorageService;

  beforeEach(() => {
    mockInvoke.mockReset();
    vi.doMock('@tauri-apps/api/core', () => ({ invoke: mockInvoke }));
    svc = new TauriStorageService();
  });

  afterEach(() => {
    vi.doUnmock('@tauri-apps/api/core');
  });

  it('saveDeck invokes save_deck command', async () => {
    mockInvoke.mockResolvedValue(undefined);
    await svc.saveDeck('burn', '4 Bolt');
    expect(mockInvoke).toHaveBeenCalledWith('save_deck', { name: 'burn', content: '4 Bolt' });
  });

  it('loadDeck invokes load_deck and returns content', async () => {
    mockInvoke.mockResolvedValue('4 Bolt');
    const result = await svc.loadDeck('burn');
    expect(result).toBe('4 Bolt');
    expect(mockInvoke).toHaveBeenCalledWith('load_deck', { name: 'burn' });
  });

  it('loadDeck returns null on error', async () => {
    mockInvoke.mockRejectedValue(new Error('not found'));
    const result = await svc.loadDeck('missing');
    expect(result).toBeNull();
  });

  it('listDecks invokes list_decks', async () => {
    mockInvoke.mockResolvedValue(['a', 'b']);
    const result = await svc.listDecks();
    expect(result).toEqual(['a', 'b']);
  });

  it('deleteDeck invokes delete_deck', async () => {
    mockInvoke.mockResolvedValue(undefined);
    await svc.deleteDeck('burn');
    expect(mockInvoke).toHaveBeenCalledWith('delete_deck', { name: 'burn' });
  });

  it('saveSettings invokes save_settings', async () => {
    mockInvoke.mockResolvedValue(undefined);
    await svc.saveSettings('{"theme":"dark"}');
    expect(mockInvoke).toHaveBeenCalledWith('save_settings', { content: '{"theme":"dark"}' });
  });

  it('loadSettings returns content', async () => {
    mockInvoke.mockResolvedValue('{"theme":"dark"}');
    const result = await svc.loadSettings();
    expect(result).toBe('{"theme":"dark"}');
  });

  it('loadSettings returns null on error', async () => {
    mockInvoke.mockRejectedValue(new Error('fail'));
    const result = await svc.loadSettings();
    expect(result).toBeNull();
  });
});

describe('createStorageService with Tauri', () => {
  it('returns TauriStorageService when __TAURI_INTERNALS__ is present', () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', { value: {}, configurable: true });
    try {
      const svc = createStorageService();
      expect(svc).toBeInstanceOf(TauriStorageService);
    } finally {
      delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
    }
  });
});