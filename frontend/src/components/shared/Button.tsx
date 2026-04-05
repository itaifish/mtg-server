import { type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: 'var(--color-gold)', color: '#1a1a2e' },
  secondary: { background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' },
  danger: { background: 'var(--color-danger)', color: '#fff' },
};

const baseStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 'var(--radius)',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'opacity 0.15s',
};

export function Button({ variant = 'primary', loading, disabled, style, children, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      style={{ ...baseStyle, ...variantStyles[variant], opacity: isDisabled ? 0.6 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer', ...style }}
      disabled={isDisabled}
      {...rest}
    >
      {loading && <LoadingDots />}
      {children}
    </button>
  );
}

function LoadingDots() {
  return <span aria-label="Loading">…</span>;
}
