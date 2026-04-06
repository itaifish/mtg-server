import { Canvas } from '@react-three/fiber';
import { useUiStore } from '@/stores/uiStore';
import { useTheme } from '@/theme';
import { CameraController } from './CameraController';
import { HandZone } from './zones/HandZone';
import { OpponentHandZone } from './zones/OpponentHandZone';
import { BattlefieldZone } from './zones/BattlefieldZone';
import { GraveyardZone } from './zones/GraveyardZone';
import { StackZone } from './zones/StackZone';
import { ExileZone } from './zones/ExileZone';
import { LibraryZone } from './zones/LibraryZone';
import { mapGameStateToZones } from '@/types/game3d';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';

export function GameBoard() {
  const deselectObject = useUiStore((s) => s.deselectObject);
  const { theme } = useTheme();
  const { scene } = theme;
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useLobbyStore((s) => s.playerId);
  // TODO: use useLobbyStore playerId for perspective-based zone filtering once mapGameStateToZones supports it
  const zones = gameState ? mapGameStateToZones(gameState) : { hand: [], battlefield: [], graveyard: [], stack: [], exile: [] };
  const opponentHandSize = gameState?.players.find((p) => p.playerId !== playerId)?.handSize ?? 0;
  const myLibrarySize = gameState?.players.find((p) => p.playerId === playerId)?.librarySize ?? 0;
  const opponentLibrarySize = gameState?.players.find((p) => p.playerId !== playerId)?.librarySize ?? 0;

  return (
    <Canvas
      camera={{ fov: 45, position: [0, -10, 8], near: 0.01, far: 200 }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={deselectObject}
    >
      <ambientLight intensity={1.5} />

      {/* Table surface */}
      <mesh rotation={[0, 0, 0]} position={[0, 0, -0.1]}>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color={scene.tableSurface} />
      </mesh>

      <OpponentHandZone cardCount={opponentHandSize} />
      <HandZone cards={zones.hand} />
      <BattlefieldZone cards={zones.battlefield} playerId={playerId ?? ''} />
      <GraveyardZone cards={zones.graveyard} />
      <StackZone cards={zones.stack} />
      <ExileZone cards={zones.exile} />

      {/* Libraries — right side, my library near hand, opponent's near their hand */}
      <LibraryZone cardCount={myLibrarySize} position={[9, -8, 0.1]} drawTarget={[0, -10, 2.5]} />
      <LibraryZone cardCount={opponentLibrarySize} position={[-9, 6, 0.1]} drawTarget={[0, 7, 2.5]} />

      <CameraController />
    </Canvas>
  );
}
