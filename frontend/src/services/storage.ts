/** Storage abstraction that routes to Tauri file I/O or localStorage. */

export interface StorageService {
  saveDeck(name: string, content: string): Promise<void>;
  loadDeck(name: string): Promise<string | null>;
  listDecks(): Promise<string[]>;
  deleteDeck(name: string): Promise<void>;
  saveSettings(content: string): Promise<void>;
  loadSettings(): Promise<string | null>;
}

/** Detects if running inside a Tauri webview. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const DECK_PREFIX = 'mtg-deck-';
const SETTINGS_KEY = 'mtg-settings';

export class WebStorageService implements StorageService {
  async saveDeck(name: string, content: string): Promise<void> {
    localStorage.setItem(`${DECK_PREFIX}${name}`, content);
  }

  async loadDeck(name: string): Promise<string | null> {
    return localStorage.getItem(`${DECK_PREFIX}${name}`);
  }

  async listDecks(): Promise<string[]> {
    const names: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DECK_PREFIX)) {
        names.push(key.slice(DECK_PREFIX.length));
      }
    }
    return names.sort();
  }

  async deleteDeck(name: string): Promise<void> {
    localStorage.removeItem(`${DECK_PREFIX}${name}`);
  }

  async saveSettings(content: string): Promise<void> {
    localStorage.setItem(SETTINGS_KEY, content);
  }

  async loadSettings(): Promise<string | null> {
    return localStorage.getItem(SETTINGS_KEY);
  }
}

export class TauriStorageService implements StorageService {
  private async invoke<T>(cmd: string, args?: Record<string, string>): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }

  async saveDeck(name: string, content: string): Promise<void> {
    await this.invoke('save_deck', { name, content });
  }

  async loadDeck(name: string): Promise<string | null> {
    try {
      return await this.invoke<string>('load_deck', { name });
    } catch {
      return null;
    }
  }

  async listDecks(): Promise<string[]> {
    return this.invoke<string[]>('list_decks');
  }

  async deleteDeck(name: string): Promise<void> {
    await this.invoke('delete_deck', { name });
  }

  async saveSettings(content: string): Promise<void> {
    await this.invoke('save_settings', { content });
  }

  async loadSettings(): Promise<string | null> {
    try {
      return await this.invoke<string>('load_settings');
    } catch {
      return null;
    }
  }
}

export function createStorageService(): StorageService {
  return isTauri() ? new TauriStorageService() : new WebStorageService();
}

/** Singleton storage instance. */
export const storage = createStorageService();
