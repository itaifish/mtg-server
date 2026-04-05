import { Canvas } from '@react-three/fiber';
import { useUiStore } from '@/stores/uiStore';
import { CameraController } from './CameraController';
import { HandZone } from './zones/HandZone';
import { BattlefieldZone } from './zones/BattlefieldZone';
import { GraveyardZone } from './zones/GraveyardZone';
import { StackZone } from './zones/StackZone';
import { ExileZone } from './zones/ExileZone';
import { PLACEHOLDER_ZONES } from '@/types/game3d';

export function GameBoard() {
  const deselectObject = useUiStore((s) => s.deselectObject);
  const zones = PLACEHOLDER_ZONES;

  return (
    <Canvas
      orthographic
      camera={{ zoom: 50, position: [0, -2, 12], near: 0.1, far: 100 }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={deselectObject}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 10]} intensity={0.8} />

      {/* Table surface */}
      <mesh rotation={[0, 0, 0]} position={[0, 0, -0.1]}>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color="#2d5a27" />
      </mesh>

      <HandZone cards={zones.hand} />
      <BattlefieldZone cards={zones.battlefield} />
      <GraveyardZone cards={zones.graveyard} />
      <StackZone cards={zones.stack} />
      <ExileZone cards={zones.exile} />

      <CameraController />
    </Canvas>
  );
}
