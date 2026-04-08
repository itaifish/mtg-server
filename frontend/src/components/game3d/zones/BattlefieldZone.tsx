import { useUiStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useTheme } from '@/theme';
import { Card3D } from '../Card3D';
import type { CardData } from '@/types/game3d';

interface BattlefieldZoneProps {
  cards: CardData[];
  playerId: string;
}

function CardRow({ cards, y, flipZ = false, targetedIds, manaAbilityIds }: { cards: CardData[]; y: number; flipZ?: boolean; targetedIds: Set<number>; manaAbilityIds: Set<number> }) {
  return (
    <group position={[0, y, 0]}>
      {cards.map((card, i) => {
        const x = (i - (cards.length - 1) / 2) * 1.3;
        const rotZ = card.tapped ? -Math.PI / 2 : flipZ ? Math.PI : 0;
        return <Card3D key={card.objectId} card={card} position={[x, 0, i * 0.01]} rotation={[0, 0, rotZ]} highlighted={targetedIds.has(card.objectId) || manaAbilityIds.has(card.objectId)} />;
      })}
    </group>
  );
}

export function BattlefieldZone({ cards, playerId }: BattlefieldZoneProps) {
  const draggingObjectId = useUiStore((s) => s.draggingObjectId);
  const { theme } = useTheme();
  const stack = useGameStore((s) => s.gameState?.stack);

  const targetedIds = new Set<number>();
  for (const entry of stack ?? []) {
    for (const t of entry.targets ?? []) {
      if ('object' in t) targetedIds.add(t.object.objectId);
    }
  }

  const manaAbilityIds = useUiStore((s) => s.manaAbilityIds) ?? new Set<number>();

  const mine = cards.filter((c) => c.controller === playerId);
  const theirs = cards.filter((c) => c.controller !== playerId);

  const myLands = mine.filter((c) => c.cardType === 'land');
  const myPermanents = mine.filter((c) => c.cardType !== 'land');
  const theirLands = theirs.filter((c) => c.cardType === 'land');
  const theirPermanents = theirs.filter((c) => c.cardType !== 'land');

  return (
    <group position={[0, 0, 0.1]}>
      {/* Drop zone highlight when dragging */}
      {draggingObjectId != null && (
        <mesh position={[0, 0, -0.05]}>
          <planeGeometry args={[12, 7]} />
          <meshBasicMaterial color={theme.colors.accent} transparent opacity={0.08} />
        </mesh>
      )}

      {/* Top: opponent's lands */}
      <CardRow cards={theirLands} y={2.8} flipZ targetedIds={targetedIds} manaAbilityIds={manaAbilityIds} />
      {/* Opponent's non-land permanents */}
      <CardRow cards={theirPermanents} y={1.2} flipZ targetedIds={targetedIds} manaAbilityIds={manaAbilityIds} />
      {/* Our non-land permanents */}
      <CardRow cards={myPermanents} y={-0.4} targetedIds={targetedIds} manaAbilityIds={manaAbilityIds} />
      {/* Bottom: our lands (closest to hand) */}
      <CardRow cards={myLands} y={-2.0} targetedIds={targetedIds} manaAbilityIds={manaAbilityIds} />
    </group>
  );
}
