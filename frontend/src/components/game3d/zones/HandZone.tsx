import { useCallback, useMemo } from 'react';
import { useSprings, animated } from '@react-spring/three';
import { useGameStore } from '@/stores/gameStore';
import { useUiStore } from '@/stores/uiStore';
import { useGameActions } from '@/hooks/useGameActions';
import { LegalActionType } from '@/types/enums';
import { Card3D } from '../Card3D';
import type { CardData } from '@/types/game3d';

interface HandZoneProps {
  cards: CardData[];
}

const SPRING_CONFIG = { tension: 170, friction: 26 };
const BATTLEFIELD_DROP_Y = -2.5;

export function HandZone({ cards }: HandZoneProps) {
  const legalActions = useGameStore((s) => s.legalActions);
  const handOrder = useUiStore((s) => s.handOrder);
  const setHandOrder = useUiStore((s) => s.setHandOrder);
  const { playLand, castSpell } = useGameActions();

  const playLandIds = new Set(
    legalActions.filter((a) => a.actionType === LegalActionType.PLAY_LAND && a.objectId != null).map((a) => a.objectId!),
  );
  const castSpellIds = new Set(
    legalActions.filter((a) => a.actionType === LegalActionType.CAST_SPELL && a.objectId != null).map((a) => a.objectId!),
  );
  const legalObjectIds = new Set([...playLandIds, ...castSpellIds]);

  // Apply local hand ordering — if handOrder matches current card IDs, use it; otherwise reset
  const orderedCards = useMemo(() => {
    const cardIds = cards.map((c) => c.objectId);
    if (handOrder.length === cards.length && handOrder.every((id) => cardIds.includes(id))) {
      return handOrder.map((id) => cards.find((c) => c.objectId === id)!);
    }
    return cards;
  }, [cards, handOrder]);

  const handleReorder = useCallback((draggedId: number, worldX: number) => {
    const count = orderedCards.length;
    const spread = Math.min(count * 1.2, 6);
    // Find which slot the X position maps to
    const slotWidth = count > 1 ? spread / (count - 1) : 1;
    const newIndex = Math.round((worldX + spread / 2) / slotWidth);
    const clampedIndex = Math.max(0, Math.min(count - 1, newIndex));

    const newOrder = orderedCards.map((c) => c.objectId);
    const oldIndex = newOrder.indexOf(draggedId);
    if (oldIndex === -1 || oldIndex === clampedIndex) return;
    newOrder.splice(oldIndex, 1);
    newOrder.splice(clampedIndex, 0, draggedId);
    setHandOrder(newOrder);
  }, [orderedCards, setHandOrder]);

  const handleCardDrop = useCallback((card: CardData, worldY: number, worldX: number) => {
    if (worldY > BATTLEFIELD_DROP_Y) {
      // Play the card
      if (playLandIds.has(card.objectId)) {
        playLand(card.objectId);
        return;
      }
      if (castSpellIds.has(card.objectId)) {
        castSpell(card.objectId, []);
        return;
      }
    }
    // Reorder within hand
    handleReorder(card.objectId, worldX);
  }, [playLandIds, castSpellIds, playLand, castSpell, handleReorder]);

  const count = orderedCards.length;
  const spread = Math.min(count * 1.2, 6);

  const springs = useSprings(
    count,
    orderedCards.map((_, i) => {
      const t = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
      return {
        position: [t * (spread / 2), -Math.abs(t) * 0.15, i * 0.03] as [number, number, number],
        config: SPRING_CONFIG,
      };
    }),
  );

  return (
    <group position={[0, -7, 2.5]} rotation={[Math.atan2(8, 10), 0, 0]}>
      {orderedCards.map((card, i) => {
        const t = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
        const rotZ = -t * 0.08;
        const springPos = springs[i].position as unknown as [number, number, number];
        const isLegal = legalObjectIds.has(card.objectId);
        return (
          <animated.group key={card.objectId} position={springPos}>
            <Card3D
              card={card}
              position={[0, 0, 0]}
              rotation={[0, 0, rotZ]}
              highlighted={isLegal}
              draggable
              onDrop={handleCardDrop}
            />
          </animated.group>
        );
      })}
    </group>
  );
}
