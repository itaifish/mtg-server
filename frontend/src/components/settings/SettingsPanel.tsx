import { useState, useEffect } from 'react';
import { Modal, Input, Button, Select } from '@/components/shared';
import { storage } from '@/services/storage';
import { useTheme } from '@/theme';
import { useUiStore } from '@/stores/uiStore';

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
  const { theme, setTheme, availableThemes } = useTheme();

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

  const themeOptions = availableThemes.map((t) => ({ value: t.id, label: t.name }));
  const selectedTheme = availableThemes.find((t) => t.id === theme.id);

  const cameraPosition = useUiStore((s) => s.cameraPosition);
  const setCameraPosition = useUiStore((s) => s.setCameraPosition);
  const autoTapLands = useUiStore((s) => s.autoTapLands);
  const toggleAutoTapLands = useUiStore((s) => s.toggleAutoTapLands);
  const autoPassPriority = useUiStore((s) => s.autoPassPriority);
  const toggleAutoPassPriority = useUiStore((s) => s.toggleAutoPassPriority);

  return (
    <Modal title="Settings" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Input label="Server URL" value={settings.serverUrl} onChange={(e) => setSettings((s) => ({ ...s, serverUrl: e.target.value }))} />
        <Input label="API Key" value={settings.apiKey} onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))} type="password" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="camera-pref" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Top-Down Camera</label>
          <input id="camera-pref" type="checkbox" checked={cameraPosition === 'topdown'} onChange={(e) => setCameraPosition(e.target.checked ? 'topdown' : 'default')} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="auto-tap" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Auto-tap lands</label>
          <input id="auto-tap" type="checkbox" checked={autoTapLands} onChange={toggleAutoTapLands} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label htmlFor="auto-pass" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Auto-pass priority</label>
          <input id="auto-pass" type="checkbox" checked={autoPassPriority} onChange={toggleAutoPassPriority} />
        </div>
        <Select label="Theme" options={themeOptions} value={theme.id} onChange={(e) => setTheme(e.target.value)} />
        {selectedTheme && (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>{selectedTheme.description}</p>
        )}
        <Button variant="secondary" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
