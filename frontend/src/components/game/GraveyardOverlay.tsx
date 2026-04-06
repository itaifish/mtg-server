import { useUiStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useCardImage } from '@/hooks/useCardImage';
import { Button } from '@/components/shared';
import type { CardInfo } from '@/types/api';

function GraveyardCard({ card }: { card: CardInfo }) {
  const imageUrl = useCardImage(card.oracleId);
  const selectObject = useUiStore((s) => s.selectObject);
  return (
    <div
      onClick={() => card.objectId != null && selectObject(card.objectId)}
      style={{
        width: '120px', borderRadius: '6px', overflow: 'hidden',
        border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
        flexShrink: 0, cursor: 'pointer',
      }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={card.name} style={{ width: '100%', display: 'block' }} />
      ) : (
        <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
          {card.name}
        </div>
      )}
    </div>
  );
}

export function GraveyardOverlay() {
  const viewing = useUiStore((s) => s.viewingGraveyard);
  const close = useUiStore((s) => s.setViewingGraveyard);
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useLobbyStore((s) => s.playerId);

  if (!viewing || !gameState) return null;

  const graveyards = gameState.graveyards ?? [];
  const gy = viewing === 'mine'
    ? graveyards.find((g) => g.playerId === playerId)
    : graveyards.find((g) => g.playerId !== playerId);
  const cards = gy?.cards ?? [];
  const label = viewing === 'mine' ? 'Your Graveyard' : "Opponent's Graveyard";

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      background: 'var(--color-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={() => close(null)}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)', padding: '16px', maxWidth: '80vw', maxHeight: '70vh',
          display: 'flex', flexDirection: 'column', gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🪦 {label} ({cards.length})</span>
          <Button variant="secondary" onClick={() => close(null)} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>✕</Button>
        </div>
        {cards.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '16px', textAlign: 'center' }}>Empty</div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', overflowY: 'auto', maxHeight: '55vh' }}>
            {cards.map((card, i) => <GraveyardCard key={card.objectId ?? i} card={card} />)}
          </div>
        )}
      </div>
    </div>
  );
}
