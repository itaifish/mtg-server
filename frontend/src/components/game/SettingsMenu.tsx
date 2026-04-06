import { useUiStore } from '@/stores/uiStore';
import { useTheme } from '@/theme';
import { Button } from '@/components/shared';

export function SettingsMenu() {
  const showSettings = useUiStore((s) => s.showSettings);
  const toggleSettings = useUiStore((s) => s.toggleSettings);
  const cameraPosition = useUiStore((s) => s.cameraPosition);
  const setCameraPosition = useUiStore((s) => s.setCameraPosition);
  const autoTapLands = useUiStore((s) => s.autoTapLands);
  const toggleAutoTapLands = useUiStore((s) => s.toggleAutoTapLands);
  const { theme, setTheme, availableThemes } = useTheme();

  if (!showSettings) return null;

  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)', padding: '16px', zIndex: 50,
      minWidth: '260px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Settings</span>
        <Button variant="secondary" onClick={toggleSettings} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>✕</Button>
      </div>

      {/* Theme picker */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Theme</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {availableThemes.map((t) => (
            <Button
              key={t.id}
              variant={theme.id === t.id ? 'primary' : 'secondary'}
              onClick={() => setTheme(t.id)}
              style={{ fontSize: '0.7rem', padding: '4px 10px' }}
            >
              {t.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Camera toggle */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Camera</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            variant={cameraPosition === 'default' ? 'primary' : 'secondary'}
            onClick={() => setCameraPosition('default')}
            style={{ fontSize: '0.7rem', padding: '4px 10px' }}
          >
            Angled
          </Button>
          <Button
            variant={cameraPosition === 'topdown' ? 'primary' : 'secondary'}
            onClick={() => setCameraPosition('topdown')}
            style={{ fontSize: '0.7rem', padding: '4px 10px' }}
          >
            Top-Down
          </Button>
        </div>
      </div>

      {/* Auto-tap lands */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
          <input type="checkbox" checked={autoTapLands} onChange={toggleAutoTapLands} />
          Auto-tap lands
        </label>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Automatically tap lands to pay for spells
        </div>
      </div>
    </div>
  );
}
