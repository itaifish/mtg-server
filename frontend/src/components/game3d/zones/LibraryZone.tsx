import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH } from '@/types/game3d';

interface LibraryZoneProps {
  cardCount: number;
  position: [number, number, number];
  /** Target position for draw animation (e.g. hand zone center) */
  drawTarget: [number, number, number];
}

function CardBackFace() {
  const texture = useTexture('/card_back.png');
  return (
    <mesh position={[0, 0, CARD_DEPTH / 2 + 0.001]}>
      <planeGeometry args={[CARD_WIDTH * 0.95, CARD_HEIGHT * 0.95]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

/** Animated card that flies from library to hand */
function DrawAnimation({ from, to, onComplete }: { from: THREE.Vector3; to: THREE.Vector3; onComplete: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const texture = useTexture('/card_back.png');

  useFrame((_, delta) => {
    if (!ref.current) return;
    progress.current = Math.min(progress.current + delta * 3, 1);
    const t = progress.current;
    // Ease out cubic
    const ease = 1 - Math.pow(1 - t, 3);
    ref.current.position.lerpVectors(from, to, ease);
    // Arc upward
    ref.current.position.z = 2 * Math.sin(ease * Math.PI) + from.z;
    if (t >= 1) onComplete();
  });

  return (
    <group ref={ref} position={[from.x, from.y, from.z]}>
      <mesh>
        <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH]} />
        <meshStandardMaterial color="#1a0033" />
      </mesh>
      <mesh position={[0, 0, CARD_DEPTH / 2 + 0.001]}>
        <planeGeometry args={[CARD_WIDTH * 0.95, CARD_HEIGHT * 0.95]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </group>
  );
}

export function LibraryZone({ cardCount, position, drawTarget }: LibraryZoneProps) {
  const [prevCount, setPrevCount] = useState(cardCount);
  const [animating, setAnimating] = useState(false);

  // Detect when a card is drawn (count decreases by 1)
  useEffect(() => {
    if (cardCount < prevCount && prevCount - cardCount === 1) {
      setAnimating(true);
    }
    setPrevCount(cardCount);
  }, [cardCount, prevCount]);

  // Stack height — show a few offset cards to look like a pile
  const pileCards = Math.min(cardCount, 5);
  const from = new THREE.Vector3(position[0], position[1], position[2] + pileCards * 0.02);
  const to = new THREE.Vector3(drawTarget[0], drawTarget[1], drawTarget[2]);

  return (
    <group position={position}>
      {/* Card pile — slight offsets for realism */}
      {Array.from({ length: pileCards }, (_, i) => {
        // Deterministic pseudo-random offsets per card
        const seed = i * 7 + 3;
        const ox = ((seed * 13) % 17 - 8) * 0.005;
        const oy = ((seed * 11) % 13 - 6) * 0.005;
        const rz = ((seed * 9) % 11 - 5) * 0.003;
        return (
          <group key={i} position={[ox, oy, i * CARD_DEPTH]} rotation={[0, 0, rz]}>
            <mesh>
              <boxGeometry args={[CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH]} />
              <meshStandardMaterial color="#1a0033" />
            </mesh>
            {i === pileCards - 1 && <CardBackFace />}
          </group>
        );
      })}

      {/* Card count label */}
      {cardCount > 0 && (
        <mesh position={[0, -CARD_HEIGHT * 0.6, 0.1]}>
          <planeGeometry args={[0.6, 0.25]} />
          <meshBasicMaterial color="black" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Draw animation */}
      {animating && (
        <group position={[-position[0], -position[1], -position[2]]}>
          <DrawAnimation from={from} to={to} onComplete={() => setAnimating(false)} />
        </group>
      )}
    </group>
  );
}
