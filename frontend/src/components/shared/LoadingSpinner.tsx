const spinnerStyle: React.CSSProperties = {
  width: '32px', height: '32px',
  border: '3px solid var(--color-border)',
  borderTopColor: 'var(--color-gold)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

export function LoadingSpinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={spinnerStyle} role="status" aria-label="Loading" />
    </>
  );
}
