import { Canvas } from '@react-three/fiber';
import { useUiStore } from '@/stores/uiStore';
import { useTheme } from '@/theme';
import { CameraController } from './CameraController';
import { HandZone } from './zones/HandZone';
import { BattlefieldZone } from './zones/BattlefieldZone';
import { GraveyardZone } from './zones/GraveyardZone';
import { StackZone } from './zones/StackZone';
import { ExileZone } from './zones/ExileZone';
import { PLACEHOLDER_ZONES } from '@/types/game3d';

export function GameBoard() {
  const deselectObject = useUiStore((s) => s.deselectObject);
  const { theme } = useTheme();
  const { scene } = theme;
  const zones = PLACEHOLDER_ZONES;

  return (
    <Canvas
      orthographic
      camera={{ zoom: 50, position: [0, -2, 12], near: 0.1, far: 100 }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={deselectObject}
    >
      <ambientLight intensity={scene.ambientLightIntensity} />
      <directionalLight position={[5, 5, 10]} intensity={scene.directionalLightIntensity} />

      {/* Table surface */}
      <mesh rotation={[0, 0, 0]} position={[0, 0, -0.1]}>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color={scene.tableSurface} />
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
