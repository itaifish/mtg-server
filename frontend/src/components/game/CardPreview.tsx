import { useMemo } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useCardImage } from '@/hooks/useCardImage';
import type { CardData } from '@/types/game3d';
import { mapGameStateToZones } from '@/types/game3d';

/** Finds a card by objectId across all zones */
function findCard(zones: ReturnType<typeof mapGameStateToZones>, objectId: number): CardData | undefined {
  const allCards = [...zones.hand, ...zones.battlefield, ...zones.graveyard, ...zones.stack, ...zones.exile];
  return allCards.find((c) => c.objectId === objectId);
}

function PreviewContent({ card }: { card: CardData }) {
  const imageUrl = useCardImage((card as CardData & { oracleId?: string }).oracleId);
  const deselectObject = useUiStore((s) => s.deselectObject);

  return (
    <div
      style={{
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 90,
        pointerEvents: 'auto',
      }}
    >
      <div
        onClick={deselectObject}
        style={{
          width: '260px',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '2px solid var(--color-border)',
          background: 'var(--color-surface)',
          cursor: 'pointer',
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={card.name} style={{ width: '100%', display: 'block' }} />
        ) : (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>{card.name}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{card.cardType}</div>
            {card.power != null && card.toughness != null && (
              <div style={{ marginTop: '8px', fontSize: '1rem' }}>{card.power}/{card.toughness}</div>
            )}
          </div>
        )}
        {(card.power != null || (card.counters && card.counters.length > 0)) && (
          <div style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)' }}>
            {card.power != null && card.toughness != null && (
              <span style={{ fontWeight: 700 }}>{card.power}/{card.toughness}</span>
            )}
            {card.counters && card.counters.length > 0 && (
              <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>
                {card.counters.map((c) =>
                  c.counterType.startsWith('PowerToughness') ? `+${c.count}/+${c.count}` : `${c.counterType} ×${c.count}`
                ).join(', ')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CardPreview() {
  const selectedObjectId = useUiStore((s) => s.selectedObjectId);
  const gameState = useGameStore((s) => s.gameState);

  const card = useMemo(() => {
    if (selectedObjectId == null || !gameState) return undefined;
    const zones = mapGameStateToZones(gameState);
    return findCard(zones, selectedObjectId);
  }, [selectedObjectId, gameState]);

  if (!card) return null;

  return <PreviewContent card={card} />;
}
