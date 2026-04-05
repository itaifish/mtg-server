import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};

const panelStyle: React.CSSProperties = {
  background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius)',
  border: '1px solid var(--color-border)', padding: '24px',
  minWidth: '320px', maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto',
};

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--color-text)', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
