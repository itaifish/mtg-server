import { useState, useEffect } from 'react';
import { Modal, Input, Button } from '@/components/shared';
import { storage } from '@/services/storage';

interface SettingsPanelProps {
  onClose: () => void;
}

const SETTINGS_KEY = 'mtg-settings';

interface Settings {
  serverUrl: string;
  apiKey: string;
  cameraPreference: 'default' | 'overhead';
}

const DEFAULT_SETTINGS: Settings = { serverUrl: 'http://localhost:13734', apiKey: '', cameraPreference: 'default' };

function parseSettings(raw: string | null): Settings {
  try {
    if (raw) return JSON.parse(raw) as Settings;
  } catch { /* use defaults */ }
  return { ...DEFAULT_SETTINGS };
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>(() => {
    // Sync init from localStorage for instant render; async load overwrites if different
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  });

  useEffect(() => {
    storage.loadSettings().then((raw) => {
      if (raw !== null) {
        setSettings(parseSettings(raw));
      }
    });
  }, []);

  useEffect(() => {
    const json = JSON.stringify(settings);
    // Write to both localStorage (sync fallback) and storage service
    localStorage.setItem(SETTINGS_KEY, json);
    storage.saveSettings(json);
  }, [settings]);

  return (
    <Modal title="Settings" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input label="Server URL" value={settings.serverUrl} onChange={(e) => setSettings((s) => ({ ...s, serverUrl: e.target.value }))} />
        <Input label="API Key" value={settings.apiKey} onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))} type="password" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="camera-pref" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Overhead Camera</label>
          <input id="camera-pref" type="checkbox" checked={settings.cameraPreference === 'overhead'} onChange={(e) => setSettings((s) => ({ ...s, cameraPreference: e.target.checked ? 'overhead' : 'default' }))} />
        </div>
        <Button variant="secondary" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
