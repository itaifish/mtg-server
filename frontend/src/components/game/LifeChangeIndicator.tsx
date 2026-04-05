import { useState, useEffect, useRef, useCallback } from 'react';

interface LifeChange {
  id: number;
  amount: number;
}

interface LifeChangeIndicatorProps {
  /** Current life total — changes trigger the floating indicator */
  life: number;
}

const DISPLAY_DURATION_MS = 1500;

/**
 * Floating +/- number that appears when life total changes.
 * Green for gain, red for loss. Fades up and disappears after 1.5s.
 */
export function LifeChangeIndicator({ life }: LifeChangeIndicatorProps) {
  const [changes, setChanges] = useState<LifeChange[]>([]);
  const prevLife = useRef(life);
  const idCounter = useRef(0);

  useEffect(() => {
    const diff = life - prevLife.current;
    prevLife.current = life;
    if (diff === 0) return;

    const id = ++idCounter.current;
    setChanges((prev) => [...prev, { id, amount: diff }]);

    const timer = setTimeout(() => {
      setChanges((prev) => prev.filter((c) => c.id !== id));
    }, DISPLAY_DURATION_MS);

    return () => clearTimeout(timer);
  }, [life]);

  const getStyle = useCallback((amount: number): React.CSSProperties => ({
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    fontWeight: 700,
    fontSize: '1.2rem',
    color: amount > 0 ? 'var(--color-success)' : 'var(--color-danger)',
    pointerEvents: 'none',
    animation: 'life-change-float 1.5s ease-out forwards',
  }), []);

  if (changes.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes life-change-float {
          0% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-24px); }
        }
      `}</style>
      <div style={{ position: 'relative', height: 0, overflow: 'visible' }} aria-live="polite">
        {changes.map((c) => (
          <span key={c.id} style={getStyle(c.amount)}>
            {c.amount > 0 ? `+${c.amount}` : c.amount}
          </span>
        ))}
      </div>
    </>
  );
}
