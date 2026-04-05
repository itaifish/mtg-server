import { Card3D } from '../Card3D';
import type { CardData } from '@/types/game3d';

interface BattlefieldZoneProps {
  cards: CardData[];
}

export function BattlefieldZone({ cards }: BattlefieldZoneProps) {
  const lands = cards.filter((c) => c.cardType === 'land');
  const nonLands = cards.filter((c) => c.cardType !== 'land');

  return (
    <group position={[0, -1, 0.1]}>
      {/* Non-land permanents row */}
      <group position={[0, 1.2, 0]}>
        {nonLands.map((card, i) => {
          const x = (i - (nonLands.length - 1) / 2) * 1.3;
          const rotZ = card.tapped ? -Math.PI / 2 : 0;
          return (
            <Card3D
              key={card.objectId}
              card={card}
              position={[x, 0, 0]}
              rotation={[0, 0, rotZ]}
            />
          );
        })}
      </group>
      {/* Lands row */}
      <group position={[0, -0.5, 0]}>
        {lands.map((card, i) => {
          const x = (i - (lands.length - 1) / 2) * 1.3;
          return (
            <Card3D
              key={card.objectId}
              card={card}
              position={[x, 0, 0]}
            />
          );
        })}
      </group>
    </group>
  );
}
