import { useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useUiStore } from '@/stores/uiStore';

const CAMERA_POSITIONS: Record<string, [number, number, number]> = {
  default: [0, -2, 12],
  overhead: [0, 0, 18],
  closeup: [0, -4, 6],
};

export function CameraController() {
  const cameraPosition = useUiStore((s) => s.cameraPosition);
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(...CAMERA_POSITIONS.default));

  useFrame(() => {
    const dest = CAMERA_POSITIONS[cameraPosition] ?? CAMERA_POSITIONS.default;
    target.current.set(...dest);
    camera.position.lerp(target.current, 0.05);
  });

  return <OrbitControls enablePan={false} maxDistance={25} minDistance={4} />;
}
