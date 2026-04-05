import { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radius)',
  border: 'var(--border-width) var(--border-style) var(--color-border)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text)',
  width: '100%',
};

export function Input({ label, error, id, style, ...rest }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label htmlFor={inputId} style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{label}</label>}
      <input id={inputId} style={{ ...inputStyle, borderColor: error ? 'var(--color-danger)' : 'var(--color-border)', ...style }} {...rest} />
      {error && <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }} role="alert">{error}</span>}
    </div>
  );
}
