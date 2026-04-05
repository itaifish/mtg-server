import { Card3D } from '../Card3D';
import type { CardData } from '@/types/game3d';

interface StackZoneProps {
  cards: CardData[];
}

export function StackZone({ cards }: StackZoneProps) {
  return (
    <group position={[4, 1, 0.5]}>
      {cards.map((card, i) => (
        <Card3D
          key={card.objectId}
          card={card}
          position={[0, i * -0.4, i * 0.05]}
        />
      ))}
    </group>
  );
}
