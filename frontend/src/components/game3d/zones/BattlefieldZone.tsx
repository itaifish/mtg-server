import { useUiStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useTheme } from '@/theme';
import { Card3D } from '../Card3D';
import type { CardData } from '@/types/game3d';

interface BattlefieldZoneProps {
  cards: CardData[];
  playerId: string;
}

const MAX_PILE = 5;
const PILE_OFFSET_Y = 0.18; // vertical offset per card in a pile so title shows

interface LandPile {
  name: string;
  tapped: boolean;
  cards: CardData[];
}

function stackLands(lands: CardData[]): LandPile[] {
  const piles: LandPile[] = [];
  const map = new Map<string, LandPile>();
  for (const card of lands) {
    const key = `${card.name}:${card.tapped ? 't' : 'u'}`;
    const existing = map.get(key);
    if (existing && existing.cards.length < MAX_PILE) {
      existing.cards.push(card);
    } else {
      const pile: LandPile = { name: card.name, tapped: !!card.tapped, cards: [card] };
      const mapKey = existing ? `${key}:${piles.length}` : key;
      map.set(mapKey, pile);
      piles.push(pile);
    }
  }
  return piles;
}

function LandRow({ lands, y, flipZ = false, targetedIds, manaAbilityIds }: { lands: CardData[]; y: number; flipZ?: boolean; targetedIds: Set<number>; manaAbilityIds: Set<number> }) {
  const piles = stackLands(lands);
  return (
    <group position={[0, y, 0]}>
      {piles.map((pile, pi) => {
        const x = (pi - (piles.length - 1) / 2) * 1.7;
        return (
          <group key={pile.cards[0].objectId} position={[x, 0, 0]}>
            {pile.cards.map((card, ci) => {
              const rotZ = card.tapped ? -Math.PI / 2 : flipZ ? Math.PI : 0;
              return (
                <Card3D
                  key={card.objectId}
                  card={card}
                  position={[0, ci * PILE_OFFSET_Y, ci * 0.01]}
                  rotation={[0, 0, rotZ]}
                  highlighted={targetedIds.has(card.objectId) || manaAbilityIds.has(card.objectId)}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

function CardRow({ cards, y, flipZ = false, targetedIds, manaAbilityIds }: { cards: CardData[]; y: number; flipZ?: boolean; targetedIds: Set<number>; manaAbilityIds: Set<number> }) {
  return (
    <group position={[0, y, 0]}>
      {cards.map((card, i) => {
        const x = (i - (cards.length - 1) / 2) * 1.7;
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
      <LandRow lands={theirLands} y={5.0} flipZ targetedIds={targetedIds} manaAbilityIds={manaAbilityIds} />
      {/* Opponent's non-land permanents */}
      <CardRow cards={theirPermanents} y={2.6} flipZ targetedIds={targetedIds} manaAbilityIds={manaAbilityIds} />
      {/* Our non-land permanents */}
      <CardRow cards={myPermanents} y={0.2} targetedIds={targetedIds} manaAbilityIds={manaAbilityIds} />
      {/* Bottom: our lands (closest to hand) */}
      <LandRow lands={myLands} y={-2.2} targetedIds={targetedIds} manaAbilityIds={manaAbilityIds} />
    </group>
  );
}
