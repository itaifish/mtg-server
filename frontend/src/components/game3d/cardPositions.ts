import * as THREE from 'three';

/** Global registry of card 3D world positions, updated each frame by Card3D */
export const cardWorldPositions = new Map<number, THREE.Vector3>();

/** Global camera reference, set by CameraController */
export let globalCamera: THREE.Camera | null = null;
export function setGlobalCamera(cam: THREE.Camera) { globalCamera = cam; }
