import { useRef, useState, useCallback, Suspense } from 'react';
import { useTexture, Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { cardWorldPositions } from './cardPositions';
import { useUiStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useTheme } from '@/theme';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_DEPTH,
  getCardColor,
} from '@/types/game3d';
import type { CardData } from '@/types/game3d';
import { useCardImage } from '@/hooks/useCardImage';

interface Card3DProps {
  card: CardData;
  position: [number, number, number];
  rotation?: [number, number, number];
  highlighted?: boolean;
  draggable?: boolean;
  onDrop?: (card: CardData, worldY: number, worldX: number) => void;
  onDrag?: (card: CardData, worldY: number, worldX: number) => void;
}

/** Renders a card image texture on the top face. Must be wrapped in Suspense. */
function CardFaceTexture({ url }: { url: string }) {
  const texture = useTexture(url);
  return (
    <mesh position={[0, 0, CARD_DEPTH / 2 + 0.005]}>
      <planeGeometry args={[CARD_WIDTH * 0.95, CARD_HEIGHT * 0.95]} />
      <meshBasicMaterial map={texture} transparent polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
}

/** Card back texture for the underside. */
function CardBackTexture() {
  const texture = useTexture('/card_back.png');
  return (
    <mesh position={[0, 0, -(CARD_DEPTH / 2 + 0.005)]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[CARD_WIDTH * 0.95, CARD_HEIGHT * 0.95]} />
      <meshBasicMaterial map={texture} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
}

/** Animated pulsing glow ring around playable cards */
function PlayableGlow({ color, margin = 0.14 }: { color: string; margin?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current || !state?.clock) return;
    const t = state.clock.getElapsedTime();
    const pulse = 0.4 + Math.sin(t * 3) * 0.2;
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    meshRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
  });
  return (
    <mesh ref={meshRef} position={[0, 0, -CARD_DEPTH]}>
      <planeGeometry args={[CARD_WIDTH + margin, CARD_HEIGHT + margin]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} />
    </mesh>
  );
}

export function Card3D({ card, position, rotation = [0, 0, 0], highlighted = false, draggable = false, onDrop, onDrag }: Card3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [dragOffset, setDragOffset] = useState<[number, number, number] | null>(null);
  const isDragging = dragOffset !== null;
  const selectedObjectId = useUiStore((s) => s.selectedObjectId);
  const selectObject = useUiStore((s) => s.selectObject);
  const isDeclaredAttacker = useUiStore((s) => s.declaredAttackerIds.has(card.objectId));
  const isCombatAttacker = useGameStore(
    (s) => s.gameState?.combat?.attackers?.some((a) => a.objectId === card.objectId) ?? false,
  );
  const showAttackerGlow = isDeclaredAttacker || isCombatAttacker;
  const combatSelectionMode = useUiStore((s) => s.combatSelectionMode);
  const isEligibleAttacker = useUiStore((s) => s.eligibleAttackerIds.has(card.objectId));
  const myPlayerId = useLobbyStore((s) => s.playerId);
  const isMine = card.controller != null && card.controller === myPlayerId;
  // A creature I control that can't currently attack (e.g. summoning sick / tapped)
  const isIneligibleAttacker =
    combatSelectionMode === 'attackers' && isMine && card.cardType === 'creature' && !isEligibleAttacker;
  const deselectObject = useUiStore((s) => s.deselectObject);
  const hoverObject = useUiStore((s) => s.hoverObject);
  const unhoverObject = useUiStore((s) => s.unhoverObject);
  const startDrag = useUiStore((s) => s.startDrag);
  const endDrag = useUiStore((s) => s.endDrag);
  const { theme } = useTheme();
  const { scene } = theme;
  const { camera, gl } = useThree();

  const imageUrl = useCardImage((card as CardData & { oracleId?: string }).oracleId);

  // Drag tracking refs to avoid stale closures
  const dragStartPointer = useRef<{ x: number; y: number } | null>(null);
  const dragGrabOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const raycaster = useRef(new THREE.Raycaster());

  const pointerToWorld = useCallback((clientX: number, clientY: number): THREE.Vector3 => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.current.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(dragPlane.current, hit);
    return hit;
  }, [camera, gl]);

  const handlePointerDown = useCallback((e: THREE.Event) => {
    if (!draggable) return;
    const evt = e as unknown as { stopPropagation: () => void; nativeEvent: PointerEvent; target: Element };
    evt.stopPropagation();
    // Capture pointer so we get move/up events even when pointer leaves the mesh
    (evt.target as Element).setPointerCapture(evt.nativeEvent.pointerId);
    dragStartPointer.current = { x: evt.nativeEvent.clientX, y: evt.nativeEvent.clientY };
    didDrag.current = false;
    // Set drag plane perpendicular to camera view through the card's position
    const groupWorld = new THREE.Vector3();
    if (groupRef.current) groupRef.current.getWorldPosition(groupWorld);
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    dragPlane.current.setFromNormalAndCoplanarPoint(camDir.negate(), groupWorld);
  }, [draggable]);

  const handlePointerMove = useCallback((e: THREE.Event) => {
    if (!dragStartPointer.current) return;
    const evt = e as unknown as { stopPropagation: () => void; nativeEvent: PointerEvent };
    evt.stopPropagation();
    const dx = evt.nativeEvent.clientX - dragStartPointer.current.x;
    const dy = evt.nativeEvent.clientY - dragStartPointer.current.y;
    // Start drag after 5px threshold
    if (!didDrag.current && Math.sqrt(dx * dx + dy * dy) < 5) return;
    if (!didDrag.current) {
      didDrag.current = true;
      startDrag(card.objectId);
      const startWorld = pointerToWorld(evt.nativeEvent.clientX, evt.nativeEvent.clientY);
      const groupWorld = new THREE.Vector3();
      if (groupRef.current) groupRef.current.getWorldPosition(groupWorld);
      dragGrabOffset.current = { x: startWorld.x - groupWorld.x, y: startWorld.y - groupWorld.y };
    }
    const world = pointerToWorld(evt.nativeEvent.clientX, evt.nativeEvent.clientY);
    // Convert world hit to group's local space
    const localHit = groupRef.current
      ? groupRef.current.worldToLocal(world.clone())
      : world;
    const localGrab = groupRef.current
      ? groupRef.current.worldToLocal(
          new THREE.Vector3(dragGrabOffset.current.x, dragGrabOffset.current.y, 0)
            .add(new THREE.Vector3().copy(groupRef.current.getWorldPosition(new THREE.Vector3())))
        )
      : new THREE.Vector3();
    setDragOffset([
      localHit.x - localGrab.x,
      localHit.y - localGrab.y,
      0,
    ]);
    if (onDrag) {
      const worldHit = pointerToWorld(evt.nativeEvent.clientX, evt.nativeEvent.clientY);
      onDrag(card, worldHit.y, worldHit.x);
    }
  }, [card.objectId, pointerToWorld, startDrag]);

  const handlePointerUp = useCallback((e: THREE.Event) => {
    if (!dragStartPointer.current) return;
    const evt = e as unknown as { stopPropagation: () => void; nativeEvent: PointerEvent; target: Element };
    evt.stopPropagation();
    (evt.target as Element).releasePointerCapture(evt.nativeEvent.pointerId);
    if (didDrag.current && onDrop) {
      // Raycast onto table plane (z=0) for drop position
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((evt.nativeEvent.clientX - rect.left) / rect.width) * 2 - 1,
        -((evt.nativeEvent.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const dropRay = new THREE.Raycaster();
      dropRay.setFromCamera(ndc, camera);
      const tablePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const tableHit = new THREE.Vector3();
      dropRay.ray.intersectPlane(tablePlane, tableHit);
      onDrop(card, tableHit.y, tableHit.x);
    }
    dragStartPointer.current = null;
    didDrag.current = false;
    setDragOffset(null);
    endDrag();
  }, [card, endDrag, onDrop, pointerToWorld]);

  const selected = selectedObjectId === card.objectId;
  const faceColor = getCardColor(card.color, scene);

  // Attacking creatures scoot forward (toward the opponent). My creatures move +Y, opponents -Y.
  const ATTACK_SCOOT = 0.7;
  const scootY = showAttackerGlow ? (isMine ? ATTACK_SCOOT : -ATTACK_SCOOT) : 0;

  const spring = useSpring({
    scale: hovered && !isDragging ? 1.08 : 1,
    posX: isDragging ? dragOffset![0] : 0,
    posY: isDragging ? dragOffset![1] : scootY + (hovered ? 0.15 : 0),
    posZ: isDragging ? dragOffset![2] + 1 : 0,
    config: isDragging
      ? { tension: 300, friction: 30 }
      : { tension: 200, friction: 40, clamp: true },
  });

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
    // Register world position for target arrows
    if (groupRef.current?.getWorldPosition) {
      const pos = new THREE.Vector3();
      groupRef.current.getWorldPosition(pos);
      cardWorldPositions.set(card.objectId, pos);
    }
  });

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    if (didDrag.current) return;
    // If in targeting mode, dispatch target event instead of selecting
    if (useUiStore.getState().targetingMode) {
      window.dispatchEvent(new CustomEvent('target-selected', { detail: { object: { objectId: card.objectId } } }));
      return;
    }
    // If this card has a mana ability during casting, tap it
    if (useUiStore.getState().manaAbilityIds.has(card.objectId)) {
      window.dispatchEvent(new CustomEvent('mana-tap', { detail: { objectId: card.objectId } }));
      return;
    }
    // If declaring attackers and this creature is eligible, toggle it as an attacker
    const ui = useUiStore.getState();
    if (ui.combatSelectionMode === 'attackers' && ui.eligibleAttackerIds.has(card.objectId)) {
      ui.toggleDeclaredAttacker(card.objectId);
      return;
    }
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
    // Show a not-allowed cursor on creatures I control that can't attack right now
    if (isIneligibleAttacker) {
      document.body.style.cursor = 'not-allowed';
    } else if (combatSelectionMode === 'attackers' && isEligibleAttacker) {
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    setHovered(false);
    unhoverObject();
    document.body.style.cursor = 'auto';
  };

  return (
    <group ref={groupRef} position={position} rotation={[rotation[0], rotation[1], 0]}>
      <animated.group scale={spring.scale} position-x={spring.posX} position-y={spring.posY} position-z={spring.posZ}>
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH]} />
          <meshBasicMaterial color={faceColor} attach="material-0" />
          <meshBasicMaterial color={faceColor} attach="material-1" />
          <meshBasicMaterial color={faceColor} attach="material-2" />
          <meshBasicMaterial color={faceColor} attach="material-3" />
          <meshBasicMaterial color={faceColor} attach="material-4" />
          <meshBasicMaterial color={faceColor} attach="material-5" />
        </mesh>

        {/* Declared attacker glow — red, persists through all of combat */}
        {showAttackerGlow && (
          <PlayableGlow color="#ff2d2d" margin={0.4} />
        )}

        {/* Playable card glow — animated pulsing ring */}
        {highlighted && !selected && !showAttackerGlow && (
          <PlayableGlow color={scene.cardHighlight} />
        )}

        {/* Selection glow */}
        {selected && !showAttackerGlow && (
          <PlayableGlow color={scene.cardGlowSelected} />
        )}

        {/* Card image texture overlay */}
        {imageUrl && (
          <Suspense fallback={null}>
            <CardFaceTexture url={imageUrl} />
          </Suspense>
        )}

        {/* Card back texture */}
        <Suspense fallback={null}>
          <CardBackTexture />
        </Suspense>

        {/* Counter badges */}
        {card.counters && card.counters.length > 0 && (
          <Html position={[0, 0, CARD_DEPTH / 2 + 0.01]} center style={{ pointerEvents: 'none' }} zIndexRange={[1, 0]}>
            <div style={{
              background: 'var(--color-surface)', color: 'var(--color-gold)', borderRadius: '8px',
              padding: '1px 5px', fontSize: '10px', fontWeight: 700,
              whiteSpace: 'nowrap', border: '1px solid var(--color-gold-dim)',
            }}>
              {card.counters.map((c) =>
                c.counterType.startsWith('PowerToughness') ? `+${c.count}/+${c.count}` : `${c.counterType} ×${c.count}`
              ).join(', ')}
            </div>
          </Html>
        )}
      </animated.group>
    </group>
  );
}
