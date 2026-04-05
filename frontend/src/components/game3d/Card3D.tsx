import { useRef, useState, useMemo } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useUiStore } from '@/stores/uiStore';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_DEPTH,
  CARD_BACK_COLOR,
  COLOR_MAP,
} from '@/types/game3d';
import type { CardData } from '@/types/game3d';

interface Card3DProps {
  card: CardData;
  position: [number, number, number];
  rotation?: [number, number, number];
  highlighted?: boolean;
}

const SPRING_CONFIG = { tension: 170, friction: 26 };
const GLOW_GOLD = new THREE.Color('#ffd700');
const GLOW_WHITE = new THREE.Color('#ffffff');
const GLOW_NONE = new THREE.Color('#000000');

export function Card3D({ card, position, rotation = [0, 0, 0], highlighted = false }: Card3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const selectedObjectId = useUiStore((s) => s.selectedObjectId);
  const selectObject = useUiStore((s) => s.selectObject);
  const deselectObject = useUiStore((s) => s.deselectObject);
  const hoverObject = useUiStore((s) => s.hoverObject);
  const unhoverObject = useUiStore((s) => s.unhoverObject);

  const selected = selectedObjectId === card.objectId;
  const faceColor = COLOR_MAP[card.color];

  // Spring for hover scale + Y lift
  const spring = useSpring({
    scale: hovered ? 1.08 : 1,
    posY: hovered ? 0.15 : 0,
    config: SPRING_CONFIG,
  });

  // Emissive glow: gold when selected, subtle white when hovered
  const emissiveColor = useMemo(() => {
    if (selected) return GLOW_GOLD;
    if (hovered) return GLOW_WHITE;
    return GLOW_NONE;
  }, [selected, hovered]);
  const emissiveIntensity = selected ? 0.4 : hovered ? 0.15 : 0;

  // Smooth tap/untap rotation via useFrame
  const targetRotZ = useRef(rotation[2]);
  targetRotZ.current = rotation[2];

  useFrame(() => {
    if (!meshRef.current) return;
    // Smooth rotation interpolation for tap/untap
    const parent = meshRef.current.parent;
    if (parent) {
      parent.rotation.z = THREE.MathUtils.lerp(parent.rotation.z, targetRotZ.current, 0.12);
    }
  });

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    if (selected) {
      deselectObject();
    } else {
      selectObject(card.objectId);
    }
  };

  const handlePointerOver = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    setHovered(true);
    hoverObject(card.objectId);
  };

  const handlePointerOut = () => {
    setHovered(false);
    unhoverObject();
  };

  const isCreature = card.cardType === 'creature' && card.power !== undefined;
  const isDark = card.color === 'black';
  const textColor = isDark ? '#ffffff' : '#000000';

  return (
    <group position={position} rotation={[rotation[0], rotation[1], 0]}>
      <animated.group scale={spring.scale} position-y={spring.posY}>
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH]} />
          <meshStandardMaterial color={faceColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} attach="material-0" />
          <meshStandardMaterial color={faceColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} attach="material-1" />
          <meshStandardMaterial color={faceColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} attach="material-2" />
          <meshStandardMaterial color={faceColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} attach="material-3" />
          <meshStandardMaterial color={faceColor} emissive={emissiveColor} emissiveIntensity={emissiveIntensity} attach="material-4" />
          <meshStandardMaterial color={CARD_BACK_COLOR} attach="material-5" />
        </mesh>

        {/* Selection outline */}
        {(selected || highlighted) && (
          <mesh>
            <boxGeometry args={[CARD_WIDTH + 0.06, CARD_HEIGHT + 0.06, CARD_DEPTH + 0.01]} />
            <meshBasicMaterial color={selected ? '#ffd700' : '#00ff88'} transparent opacity={0.6} />
          </mesh>
        )}

        {/* Card name */}
        <Text
          position={[0, CARD_HEIGHT * 0.3, CARD_DEPTH / 2 + 0.01]}
          fontSize={0.1}
          color={textColor}
          anchorX="center"
          anchorY="middle"
          maxWidth={CARD_WIDTH * 0.85}
        >
          {card.name}
        </Text>

        {/* Power/Toughness */}
        {isCreature && (
          <Text
            position={[CARD_WIDTH * 0.3, -CARD_HEIGHT * 0.35, CARD_DEPTH / 2 + 0.01]}
            fontSize={0.14}
            color={textColor}
            anchorX="center"
            anchorY="middle"
          >
            {`${card.power}/${card.toughness}`}
          </Text>
        )}
      </animated.group>
    </group>
  );
}
