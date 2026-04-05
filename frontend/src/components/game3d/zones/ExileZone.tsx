import { Text } from '@react-three/drei';
import { Card3D } from '../Card3D';
import { useTheme } from '@/theme';
import type { CardData } from '@/types/game3d';

interface ExileZoneProps {
  cards: CardData[];
}

export function ExileZone({ cards }: ExileZoneProps) {
  const topCard = cards[cards.length - 1];
  const { theme } = useTheme();

  return (
    <group position={[-5.5, -3, 0.1]}>
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
          {`Exile (${cards.length})`}
        </Text>
      )}
    </group>
  );
}
