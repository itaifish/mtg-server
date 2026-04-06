import { useTexture } from '@react-three/drei';
import { CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH } from '@/types/game3d';

interface OpponentHandZoneProps {
  cardCount: number;
}

function CardBack() {
  const texture = useTexture('/card_back.png');
  return (
    <mesh position={[0, 0, CARD_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[CARD_WIDTH * 0.95, CARD_HEIGHT * 0.95]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

export function OpponentHandZone({ cardCount }: OpponentHandZoneProps) {
  if (cardCount === 0) return null;

  const spread = Math.min(cardCount * 0.8, 5);

  return (
    <group position={[0, 7, 2.5]} rotation={[Math.atan2(8, 10), 0, Math.PI]}>
      {Array.from({ length: cardCount }, (_, i) => {
        const t = cardCount > 1 ? (i / (cardCount - 1)) * 2 - 1 : 0;
        const x = t * (spread / 2);
        return (
          <group key={i} position={[x, Math.abs(t) * 0.15, i * 0.03]} rotation={[0, 0, t * 0.08]}>
            <mesh>
              <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH]} />
              <meshStandardMaterial color="#1a0033" />
            </mesh>
            <CardBack />
          </group>
        );
      })}
    </group>
  );
}
