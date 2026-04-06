import { useRef, useState, useCallback, Suspense } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { useUiStore } from '@/stores/uiStore';
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

const SPRING_CONFIG = { tension: 170, friction: 26 };

/** Animated pulsing glow ring around playable cards */
function PlayableGlow({ color }: { color: string }) {
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
      <planeGeometry args={[CARD_WIDTH + 0.14, CARD_HEIGHT + 0.14]} />
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
      const world = pointerToWorld(evt.nativeEvent.clientX, evt.nativeEvent.clientY);
      onDrop(card, world.y, world.x);
    }
    // Always return to hand position (spring animates back)
    dragStartPointer.current = null;
    didDrag.current = false;
    setDragOffset(null);
    endDrag();
  }, [card, endDrag, onDrop, pointerToWorld]);

  const selected = selectedObjectId === card.objectId;
  const faceColor = getCardColor(card.color, scene);

  const spring = useSpring({
    scale: hovered && !isDragging ? 1.08 : 1,
    posX: isDragging ? dragOffset![0] : 0,
    posY: isDragging ? dragOffset![1] : hovered ? 0.15 : 0,
    posZ: isDragging ? dragOffset![2] + 1 : 0,
    config: isDragging ? { tension: 300, friction: 30 } : SPRING_CONFIG,
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
  });

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    if (didDrag.current) return;
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

        {/* Playable card glow — animated pulsing ring */}
        {highlighted && !selected && (
          <PlayableGlow color={scene.cardHighlight} />
        )}

        {/* Selection glow */}
        {selected && (
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
      </animated.group>
    </group>
  );
}
