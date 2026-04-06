import { useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useUiStore } from '@/stores/uiStore';

const CAMERA_POSITIONS: Record<string, [number, number, number]> = {
  default: [0, -10, 8],
  overhead: [0, 0, 18],
  closeup: [0, -6, 5],
};

/** Where the camera looks — center of the battlefield, slightly toward our side */
const LOOK_AT: [number, number, number] = [0, 0, 0];

export function CameraController() {
  const cameraPosition = useUiStore((s) => s.cameraPosition);
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3(...CAMERA_POSITIONS.default));

  useFrame(() => {
    const dest = CAMERA_POSITIONS[cameraPosition] ?? CAMERA_POSITIONS.default;
    target.current.set(...dest);
    camera.position.lerp(target.current, 0.05);
    camera.lookAt(...LOOK_AT);
  });

  return <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} target={LOOK_AT} />;
}
