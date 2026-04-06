import { Text } from '@react-three/drei';
import { Card3D } from '../Card3D';
import { useTheme } from '@/theme';
import { useUiStore } from '@/stores/uiStore';
import type { CardData } from '@/types/game3d';

interface GraveyardZoneProps {
  cards: CardData[];
  position?: [number, number, number];
  owner: 'mine' | 'opponent';
}

export function GraveyardZone({ cards, position = [5.5, -3, 0.1], owner }: GraveyardZoneProps) {
  const topCard = cards[cards.length - 1];
  const { theme } = useTheme();
  const setViewingGraveyard = useUiStore((s) => s.setViewingGraveyard);

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); if (cards.length > 0) setViewingGraveyard(owner); }}>
      {topCard ? (
        <Card3D card={topCard} position={[0, 0, 0]} />
      ) : (
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[1.2, 0.4]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
      <Text
        position={[0, -1, 0.1]}
        fontSize={0.25}
        color={theme.scene.zoneLabelColor}
        anchorX="center"
      >
        {`🪦 ${cards.length}`}
      </Text>
    </group>
  );
}
