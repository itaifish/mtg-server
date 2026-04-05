import { type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radius)',
  border: 'var(--border-width) var(--border-style) var(--color-border)',
  background: 'var(--color-bg-secondary)',
  color: 'var(--color-text)',
  width: '100%',
};

export function Select({ label, options, id, style, ...rest }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label htmlFor={selectId} style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{label}</label>}
      <select id={selectId} style={{ ...selectStyle, ...style }} {...rest}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
