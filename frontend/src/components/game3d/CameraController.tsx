import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useUiStore } from '@/stores/uiStore';
import { setGlobalCamera } from './cardPositions';

const CAMERA_POSITIONS: Record<string, [number, number, number]> = {
  default: [0, -13, 11],
  overhead: [0, 0, 18],
  closeup: [0, -6, 5],
  topdown: [0, 0, 25],
};

const LOOK_AT = new THREE.Vector3(0, 0, 0);

export function CameraController() {
  const { camera } = useThree();

  useFrame(() => {
    // Read directly from store to avoid stale closure
    const pos = useUiStore.getState().cameraPosition;
    const dest = CAMERA_POSITIONS[pos] ?? CAMERA_POSITIONS.default;
    camera.position.set(...dest);
    camera.lookAt(LOOK_AT);
    setGlobalCamera(camera);
  });

  return null;
}
