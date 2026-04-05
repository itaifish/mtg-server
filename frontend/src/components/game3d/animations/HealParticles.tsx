import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from '@/theme';

interface HealParticlesProps {
  /** Whether particles are visible/animating */
  visible: boolean;
  /** Position in world space */
  position?: [number, number, number];
  /** Number of particles (default 8) */
  count?: number;
}

/**
 * Simple particle stub for healing visualization.
 * Green/white particles float upward and fade out when visible.
 */
export function HealParticles({ visible, position = [0, 0, 0], count = 8 }: HealParticlesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const { theme } = useTheme();
  const healColors = useMemo(
    () => theme.particles.heal.map((c) => new THREE.Color(c)),
    [theme.particles.heal],
  );

  const offsets = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.random() - 0.5) * 0.6,
        speed: 0.4 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: healColors[i % healColors.length],
      })),
    [count, healColors],
  );

  useFrame((_, delta) => {
    if (!visible || !groupRef.current) {
      timeRef.current = 0;
      return;
    }
    timeRef.current += delta;
    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const mesh = children[i] as THREE.Mesh;
      const o = offsets[i];
      const t = (timeRef.current * o.speed + o.phase) % 2;
      mesh.position.y = t * 1.2;
      mesh.position.x = o.x;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - t / 2);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position}>
      {offsets.map((o, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshBasicMaterial color={o.color} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}
