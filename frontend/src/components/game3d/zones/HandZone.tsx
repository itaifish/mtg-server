import { useSprings, animated } from '@react-spring/three';
import { useGameStore } from '@/stores/gameStore';
import { Card3D } from '../Card3D';
import type { CardData } from '@/types/game3d';

interface HandZoneProps {
  cards: CardData[];
}

const SPRING_CONFIG = { tension: 170, friction: 26 };

export function HandZone({ cards }: HandZoneProps) {
  const legalActions = useGameStore((s) => s.legalActions);
  const legalObjectIds = new Set(legalActions.filter((a) => a.objectId !== undefined).map((a) => a.objectId));

  const count = cards.length;
  const spread = Math.min(count * 1.2, 6);

  // Spring-animate each card's position when hand size changes
  const springs = useSprings(
    count,
    cards.map((_, i) => {
      const t = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
      return {
        position: [t * (spread / 2), -Math.abs(t) * 0.15, i * 0.03] as [number, number, number],
        config: SPRING_CONFIG,
      };
    }),
  );

  return (
    <group position={[0, -4.5, 0.5]}>
      {cards.map((card, i) => {
        const t = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
        const rotZ = -t * 0.08;
        const springPos = springs[i].position as unknown as [number, number, number];
        return (
          <animated.group key={card.objectId} position={springPos}>
            <Card3D
              card={card}
              position={[0, 0, 0]}
              rotation={[0, 0, rotZ]}
              highlighted={legalObjectIds.has(card.objectId)}
            />
          </animated.group>
        );
      })}
    </group>
  );
}
