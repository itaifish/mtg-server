import { useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ApiClientProvider } from './api/hooks';
import { ThemeProvider } from '@/theme';
import { APP_NAME } from './constants';
import { useUiStore } from './stores/uiStore';
import { LobbyPage } from './components/lobby';
import { GamePage } from './components/game';
import { DeckBuilderPage } from './components/deckbuilder';
import { SettingsPanel } from './components/settings';
import './styles/global.css';

const SETTINGS_KEY = 'mtg-settings';

function getConfig(): { baseUrl: string; apiKey?: string } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as { serverUrl?: string; apiKey?: string };
      return { baseUrl: s.serverUrl || 'http://localhost:13734', apiKey: s.apiKey || undefined };
    }
  } catch { /* use defaults */ }
  return { baseUrl: 'http://localhost:13734' };
}

function Nav() {
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 24px', background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}><img src="/lasagna.svg" alt="" width="22" height="22" />{APP_NAME}</Link>
        <Link to="/deckbuilder" style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Deck Builder</Link>
      </div>
      <button onClick={toggleSettings} style={{ background: 'none', border: 'none', color: 'var(--color-text)', cursor: 'pointer', fontSize: '1.2rem' }} aria-label="Settings">⚙</button>
    </nav>
  );
}

export function App() {
  const showSettings = useUiStore((s) => s.showSettings);
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  const [configVersion, setConfigVersion] = useState(0);
  const config = useMemo(() => getConfig(), [configVersion]);

  const handleCloseSettings = () => {
    toggleSettings();
    setConfigVersion((v) => v + 1);
  };

  return (
    <ApiClientProvider config={config}>
      <BrowserRouter>
        <ThemeProvider>
          <Nav />
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
            <Route path="/deckbuilder" element={<DeckBuilderPage />} />
          </Routes>
          {showSettings && <SettingsPanel onClose={handleCloseSettings} />}
        </ThemeProvider>
      </BrowserRouter>
    </ApiClientProvider>
  );
}
