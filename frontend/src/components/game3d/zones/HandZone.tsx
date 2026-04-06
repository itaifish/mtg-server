import { useCallback, useMemo, useState, useRef } from 'react';
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
  const draggingObjectId = useUiStore((s) => s.draggingObjectId);
  const cameraPosition = useUiStore((s) => s.cameraPosition);
  const { playLand } = useGameActions();
  const [dragSlot, setDragSlot] = useState<number | null>(null);
  const lastDroppedId = useRef<number | null>(null);

  const playLandIds = new Set(
    legalActions.filter((a) => a.actionType === LegalActionType.PLAY_LAND && a.objectId != null).map((a) => a.objectId!),
  );
  const castSpellIds = new Set(
    legalActions.filter((a) => a.actionType === LegalActionType.CAST_SPELL && a.objectId != null).map((a) => a.objectId!),
  );
  const legalObjectIds = new Set([...playLandIds, ...castSpellIds]);

  const orderedCards = useMemo(() => {
    const cardIds = cards.map((c) => c.objectId);
    if (handOrder.length === cards.length && handOrder.every((id) => cardIds.includes(id))) {
      return handOrder.map((id) => cards.find((c) => c.objectId === id)!);
    }
    return cards;
  }, [cards, handOrder]);

  const count = orderedCards.length;
  const spread = Math.min(count * 1.2, 6);

  const slotX = useCallback((index: number, total: number) => {
    const s = Math.min(total * 1.2, 6);
    const t = total > 1 ? (index / (total - 1)) * 2 - 1 : 0;
    return t * (s / 2);
  }, []);

  const springs = useSprings(
    count,
    orderedCards.map((card, i) => {
      const isDragged = card.objectId === draggingObjectId;
      if (isDragged) {
        const t = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
        return {
          position: [t * (spread / 2), -Math.abs(t) * 0.15, i * 0.03] as [number, number, number],
          config: SPRING_CONFIG,
        };
      }
      if (draggingObjectId != null && dragSlot != null) {
        const otherIndex = orderedCards.filter((c) => c.objectId !== draggingObjectId).indexOf(card);
        const shiftedIndex = otherIndex >= dragSlot ? otherIndex + 1 : otherIndex;
        const x = slotX(shiftedIndex, count);
        const t = count > 1 ? (shiftedIndex / (count - 1)) * 2 - 1 : 0;
        return {
          position: [x, -Math.abs(t) * 0.15, shiftedIndex * 0.03] as [number, number, number],
          config: SPRING_CONFIG,
        };
      }
      const t = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
      // Just-dropped card: jump to new slot instantly so Card3D spring handles the visual return
      const immediate = card.objectId === lastDroppedId.current;
      if (immediate) lastDroppedId.current = null;
      return {
        position: [t * (spread / 2), -Math.abs(t) * 0.15, i * 0.03] as [number, number, number],
        config: SPRING_CONFIG,
        immediate,
      };
    }),
  );

  const handleCardDrag = useCallback((_card: CardData, _worldY: number, worldX: number) => {
    const slotWidth = count > 1 ? spread / (count - 1) : 1;
    const newSlot = Math.round((worldX + spread / 2) / slotWidth);
    setDragSlot(Math.max(0, Math.min(count - 1, newSlot)));
  }, [count, spread]);

  const startCasting = useUiStore((s) => s.startCasting);

  const handleCardDrop = useCallback((card: CardData, worldY: number, worldX: number) => {
    setDragSlot(null);
    if (worldY > BATTLEFIELD_DROP_Y) {
      if (playLandIds.has(card.objectId)) { playLand(card.objectId); return; }
      if (castSpellIds.has(card.objectId)) {
        startCasting({ objectId: card.objectId, cardName: card.name, manaValue: card.manaValue ?? 0, manaCost: card.manaCost });
        return;
      }
    }
    lastDroppedId.current = card.objectId;
    const newOrder = orderedCards.filter((c) => c.objectId !== card.objectId).map((c) => c.objectId);
    const slotWidth = count > 1 ? spread / (count - 1) : 1;
    const slot = Math.max(0, Math.min(count - 1, Math.round((worldX + spread / 2) / slotWidth)));
    newOrder.splice(slot, 0, card.objectId);
    setHandOrder(newOrder);
  }, [orderedCards, count, spread, playLandIds, castSpellIds, playLand, startCasting, setHandOrder]);

  return (
    <group position={[0, -7, 2.5]} rotation={[cameraPosition === 'topdown' ? 0 : Math.atan2(8, 10), 0, 0]}>
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
              onDrag={handleCardDrag}
              onDrop={handleCardDrop}
            />
          </animated.group>
        );
      })}
    </group>
  );
}
