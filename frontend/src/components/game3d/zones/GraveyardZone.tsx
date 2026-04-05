import { Text } from '@react-three/drei';
import { Card3D } from '../Card3D';
import { useTheme } from '@/theme';
import type { CardData } from '@/types/game3d';

interface GraveyardZoneProps {
  cards: CardData[];
}

export function GraveyardZone({ cards }: GraveyardZoneProps) {
  const topCard = cards[cards.length - 1];
  const { theme } = useTheme();

  return (
    <group position={[5.5, -3, 0.1]}>
      {topCard && (
        <Card3D card={topCard} position={[0, 0, 0]} />
      )}
      {cards.length > 0 && (
        <Text
          position={[0, -1, 0.1]}
          fontSize={0.2}
          color={theme.scene.zoneLabelColor}
          anchorX="center"
        >
          {`Graveyard (${cards.length})`}
        </Text>
      )}
    </group>
  );
}
