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
import { GameOverOverlay } from './GameOverOverlay';
import { CardPreview } from './CardPreview';
import { PriorityIndicator } from './PriorityIndicator';
import { PregamePanel } from './PregamePanel';
import { CombatPanel } from './CombatPanel';
import { ChoicePanel } from './ChoicePanel';
import { ManaPanel } from './ManaPanel';
import { CastingOverlay } from './CastingOverlay';
import { StackOverlay } from './StackOverlay';
import { GraveyardOverlay } from './GraveyardOverlay';
import { TargetArrows } from './TargetArrows';
import { ManaPoolDisplay, EMPTY_POOL } from './ManaPoolDisplay';
import { useUiStore } from '@/stores/uiStore';
import type { ActionInput } from '@/types/actions';
import { createSetAutoPass } from '@/types/actions';
import type { GamePhase } from '@/types/enums';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const client = useApiClient();
  const playerId = useLobbyStore((s) => s.playerId);
  const { gameState, legalActions, isSubmitting, error, clearError, startPolling, stopPolling, submitAction } = useGameStore();
  const isMyTurn = useGameStore((s) => selectIsMyTurn(s, playerId ?? ''));
  const autoPassMode = useUiStore((s) => s.autoPassMode);
  const autoPassStopAtPhase = useUiStore((s) => s.autoPassStopAtPhase);

  useEffect(() => {
    if (!gameId || !playerId) return;
    startPolling(client, gameId, playerId, 2000);
    return () => stopPolling();
  }, [client, gameId, playerId, startPolling, stopPolling]);

  const handleAction = (action: ActionInput) => {
    if (gameId && playerId) submitAction(client, gameId, playerId, action);
  };

  const handlePassUntilPhase = (phase: GamePhase) => {
    if (gameId && playerId) {
      useUiStore.getState().setAutoPassMode('UNTIL_PHASE', phase);
      submitAction(client, gameId, playerId, createSetAutoPass('UNTIL_PHASE', phase));
    }
  };

  if (!gameState) return <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><LoadingSpinner /></div>;

  const isPregame = gameState.status === GameStatus.CHOOSING_PLAY_ORDER || gameState.status === GameStatus.MULLIGAN;
  const hasCombat = legalActions.some(
    (a) => a.actionType === LegalActionType.DECLARE_ATTACKERS || a.actionType === LegalActionType.DECLARE_BLOCKERS,
  );
  const isInGame = gameState.status === GameStatus.IN_PROGRESS;

  return (
    <div className="game-page" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && <ErrorBanner message={error} onDismiss={clearError} />}
      {/* Top HUD: opponents + phase + priority */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
          {gameState.players.filter((p) => p.playerId !== playerId).map((p) => (
            <PlayerPanel key={p.playerId} player={p} isActive={gameState.activePlayerId === p.playerId} />
          ))}
        </div>
        <PriorityIndicator />
        <PhaseIndicator currentStatus={gameState.status} currentPhase={gameState.phase} landsPlayedThisTurn={gameState.landsPlayedThisTurn} onPassUntilPhase={handlePassUntilPhase} autoPassMode={autoPassMode} autoPassStopAtPhase={autoPassStopAtPhase} />
        <button onClick={useUiStore.getState().toggleSettings} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', color: 'var(--color-text-muted)' }} aria-label="Settings">⚙</button>
      </div>

      {/* Pregame panel */}
      {isPregame && (
        <div style={{ padding: '0 8px 4px' }}>
          <PregamePanel />
        </div>
      )}

      {/* 3D game board */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <GameBoard />
      </div>

      {/* Bottom HUD: my info + actions */}
      <div style={{ display: 'flex', gap: '6px', padding: '4px 8px', alignItems: 'center', flexShrink: 0 }}>
        {gameState.players.filter((p) => p.playerId === playerId).map((p) => (
          <PlayerPanel key={p.playerId} player={p} isActive={gameState.activePlayerId === p.playerId} />
        ))}
        {hasCombat && <CombatPanel />}
        <ChoicePanel />
        {isInGame && <ManaPanel />}
        {isInGame && (() => {
          const me = gameState.players.find((p) => p.playerId === playerId);
          const pool = me?.manaPool ?? EMPTY_POOL;
          return <ManaPoolDisplay pool={pool} compact />;
        })()}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <ActionBar legalActions={legalActions} isMyTurn={isMyTurn} isSubmitting={isSubmitting} onAction={handleAction} gameStatus={gameState.status} />
        </div>
      </div>

      <CardPreview />
      <CastingOverlay />
      <StackOverlay />
      <TargetArrows />
      <GraveyardOverlay />
      {gameState.status === 'FINISHED' && <GameOverOverlay players={gameState.players} />}
    </div>
  );
}
