import { useMemo } from 'react';
import * as THREE from 'three';
import { useTheme } from '@/theme';

const SHARD_COLORS = [
  '#ff0066', '#00fff2', '#8b00ff', '#ff6600', '#00ff88',
  '#ff00cc', '#0066ff', '#ffcc00', '#ff3366', '#00ccff',
  '#9933ff', '#ff4400', '#00ffaa', '#cc00ff', '#3399ff',
];

interface Shard {
  vertices: Float32Array;
  color: string;
  z: number;
}

function generateShards(count: number, width: number, height: number): Shard[] {
  const shards: Shard[] = [];
  // Seed-based pseudo-random for deterministic layout
  let seed = 42;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

  for (let i = 0; i < count; i++) {
    const cx = (rand() - 0.5) * width;
    const cy = (rand() - 0.5) * height;
    const size = 0.5 + rand() * 2.5;
    const sides = 3 + Math.floor(rand() * 3); // 3-5 sided polygons
    const verts: number[] = [];
    const angleOffset = rand() * Math.PI * 2;

    for (let s = 0; s < sides; s++) {
      const a1 = angleOffset + (s / sides) * Math.PI * 2;
      const a2 = angleOffset + ((s + 1) / sides) * Math.PI * 2;
      const r1 = size * (0.5 + rand() * 0.5);
      const r2 = size * (0.5 + rand() * 0.5);
      // Triangle fan from center
      verts.push(cx, cy, 0);
      verts.push(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1, 0);
      verts.push(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2, 0);
    }

    shards.push({
      vertices: new Float32Array(verts),
      color: SHARD_COLORS[i % SHARD_COLORS.length],
      z: -0.08 + rand() * 0.04,
    });
  }
  return shards;
}

export function TableSurface() {
  const { theme } = useTheme();
  const isShattered = theme.id === 'shattered';

  const shards = useMemo(() => isShattered ? generateShards(60, 22, 18) : [], [isShattered]);

  const border = (
    <group position={[0, 0, -0.09]}>
      <mesh position={[0, 10, 0]}><planeGeometry args={[24.1, 0.06]} /><meshBasicMaterial color="#d4a843" /></mesh>
      <mesh position={[0, -10, 0]}><planeGeometry args={[24.1, 0.06]} /><meshBasicMaterial color="#d4a843" /></mesh>
      <mesh position={[12, 0, 0]}><planeGeometry args={[0.06, 20.1]} /><meshBasicMaterial color="#d4a843" /></mesh>
      <mesh position={[-12, 0, 0]}><planeGeometry args={[0.06, 20.1]} /><meshBasicMaterial color="#d4a843" /></mesh>
    </group>
  );

  if (!isShattered) {
    return (
      <group>
        <mesh rotation={[0, 0, 0]} position={[0, 0, -0.1]}>
          <planeGeometry args={[24, 20]} />
          <meshStandardMaterial color={theme.scene.tableSurface} />
        </mesh>
        {border}
      </group>
    );
  }

  return (
    <group>
      {/* Dark base */}
      <mesh position={[0, 0, -0.12]}>
        <planeGeometry args={[24, 20]} />
        <meshBasicMaterial color="#050010" />
      </mesh>

      {/* Shattered glass shards */}
      {shards.map((shard, i) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(shard.vertices, 3));
        geo.computeVertexNormals();
        return (
          <mesh key={i} geometry={geo} position={[0, 0, shard.z]}>
            <meshBasicMaterial
              color={shard.color}
              transparent
              opacity={0.15 + (i % 5) * 0.04}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* Glowing crack lines between shards */}
      {shards.slice(0, 30).map((shard, i) => {
        const x = shard.vertices[0];
        const y = shard.vertices[1];
        const angle = (i * 137.5 * Math.PI) / 180;
        const len = 1 + (i % 4) * 0.8;
        return (
          <mesh key={`crack-${i}`} position={[x, y, -0.05]} rotation={[0, 0, angle]}>
            <planeGeometry args={[len, 0.02]} />
            <meshBasicMaterial color={SHARD_COLORS[(i * 3) % SHARD_COLORS.length]} transparent opacity={0.6} />
          </mesh>
        );
      })}
      {border}
    </group>
  );
}
