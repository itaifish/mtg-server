import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from '../SettingsPanel';

// Mock storage service — loadSettings returns null so component falls back to localStorage
vi.mock('@/services/storage', () => ({
  storage: {
    saveSettings: vi.fn(async () => {}),
    loadSettings: vi.fn(async () => null),
    saveDeck: vi.fn(),
    loadDeck: vi.fn(),
    listDecks: vi.fn(),
    deleteDeck: vi.fn(),
  },
}));

describe('SettingsPanel', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders settings form', () => {
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/server url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/overhead camera/i)).toBeInTheDocument();
  });

  it('loads defaults when no saved settings', () => {
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByLabelText(/server url/i)).toHaveValue('http://localhost:13734');
  });

  it('saves settings to localStorage on change', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel onClose={onClose} />);
    const urlInput = screen.getByLabelText(/server url/i);
    await user.clear(urlInput);
    await user.type(urlInput, 'http://example.com');
    const saved = JSON.parse(localStorage.getItem('mtg-settings') ?? '{}');
    expect(saved.serverUrl).toBe('http://example.com');
  });

  it('loads saved settings from localStorage', () => {
    localStorage.setItem('mtg-settings', JSON.stringify({ serverUrl: 'http://saved.com', apiKey: 'key123', cameraPreference: 'overhead' }));
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByLabelText(/server url/i)).toHaveValue('http://saved.com');
    expect(screen.getByLabelText(/overhead camera/i)).toBeChecked();
  });

  it('toggles camera preference', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel onClose={onClose} />);
    const checkbox = screen.getByLabelText(/overhead camera/i);
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    const saved = JSON.parse(localStorage.getItem('mtg-settings') ?? '{}');
    expect(saved.cameraPreference).toBe('overhead');
  });

  it('calls onClose when Done clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel onClose={onClose} />);
    await user.click(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalled();
  });

  it('handles corrupt localStorage gracefully', () => {
    localStorage.setItem('mtg-settings', 'not-json');
    render(<SettingsPanel onClose={onClose} />);
    expect(screen.getByLabelText(/server url/i)).toHaveValue('http://localhost:13734');
  });
});
