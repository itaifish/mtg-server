import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApiClient } from '@/api/hooks';
import { useGameStore, selectIsMyTurn } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { GameStatus, LegalActionType } from '@/types/enums';
import { ErrorBanner, LoadingSpinner } from '@/components/shared';
import { GameBoard } from '@/components/game3d';
import { PlayerPanel } from './PlayerPanel';
import { PhaseIndicator } from './PhaseIndicator';
import { ActionBar } from './ActionBar';
import { StackDisplay } from './StackDisplay';
import { GameOverOverlay } from './GameOverOverlay';
import { PriorityIndicator } from './PriorityIndicator';
import { PregamePanel } from './PregamePanel';
import { CombatPanel } from './CombatPanel';
import { ManaPanel } from './ManaPanel';
import { SpellCastPanel } from './SpellCastPanel';
import type { ActionInput } from '@/types/actions';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const client = useApiClient();
  const playerId = useLobbyStore((s) => s.playerId);
  const { gameState, legalActions, isSubmitting, error, clearError, startPolling, stopPolling, submitAction } = useGameStore();
  const isMyTurn = useGameStore((s) => selectIsMyTurn(s, playerId ?? ''));

  useEffect(() => {
    if (!gameId || !playerId) return;
    startPolling(client, gameId, playerId, 2000);
    return () => stopPolling();
  }, [client, gameId, playerId, startPolling, stopPolling]);

  const handleAction = (action: ActionInput) => {
    if (gameId && playerId) submitAction(client, gameId, playerId, action);
  };

  if (!gameState) return <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><LoadingSpinner /></div>;

  const isPregame = gameState.status === GameStatus.CHOOSING_PLAY_ORDER || gameState.status === GameStatus.MULLIGAN;
  const hasCombat = legalActions.some(
    (a) => a.actionType === LegalActionType.DECLARE_ATTACKERS || a.actionType === LegalActionType.DECLARE_BLOCKERS,
  );
  const isInGame = gameState.status === GameStatus.IN_PROGRESS;

  return (
    <div className="game-page" style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {error && <ErrorBanner message={error} onDismiss={clearError} />}
      {/* Top HUD: opponents + phase + priority */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
          {gameState.players.filter((p) => p.playerId !== playerId).map((p) => (
            <PlayerPanel key={p.playerId} player={p} isActive={gameState.activePlayerId === p.playerId} />
          ))}
        </div>
        <PriorityIndicator />
        <PhaseIndicator currentStatus={gameState.status} />
      </div>

      {/* Pregame panel */}
      {isPregame && (
        <div style={{ padding: '0 12px 12px' }}>
          <PregamePanel />
        </div>
      )}

      {/* 3D game board */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <GameBoard />
      </div>

      {/* Bottom HUD: my info + stack + panels + actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          {gameState.players.filter((p) => p.playerId === playerId).map((p) => (
            <PlayerPanel key={p.playerId} player={p} isActive={gameState.activePlayerId === p.playerId} />
          ))}
          <StackDisplay />
        </div>
        {hasCombat && <CombatPanel />}
        {isInGame && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <ManaPanel />
            <SpellCastPanel />
          </div>
        )}
        <ActionBar legalActions={legalActions} isMyTurn={isMyTurn} isSubmitting={isSubmitting} onAction={handleAction} gameStatus={gameState.status} />
      </div>

      {gameState.status === 'FINISHED' && <GameOverOverlay players={gameState.players} />}
    </div>
  );
}
