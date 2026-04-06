import { useState } from 'react';
import { LegalActionType, GameStatus } from '@/types/enums';
import type { LegalAction } from '@/types/models';
import type { ActionInput } from '@/types/actions';
import { useGameActions } from '@/hooks/useGameActions';
import { useGameStore } from '@/stores/gameStore';
import { Button } from '@/components/shared';

interface ActionBarProps {
  legalActions: LegalAction[];
  isMyTurn: boolean;
  isSubmitting: boolean;
  onAction: (action: ActionInput) => void;
  gameStatus?: GameStatus;
}

/** Actions handled by dedicated panels or drag-to-play */
const hiddenActions = new Set<string>([
  LegalActionType.CHOOSE_FIRST_PLAYER,
  LegalActionType.KEEP_HAND,
  LegalActionType.MULLIGAN,
  LegalActionType.DECLARE_ATTACKERS,
  LegalActionType.DECLARE_BLOCKERS,
  LegalActionType.ACTIVATE_MANA_ABILITY,
  LegalActionType.CAST_SPELL,
  LegalActionType.PLAY_LAND,
  LegalActionType.CONCEDE,
  LegalActionType.PASS_PRIORITY,
]);

const actionLabels: Record<string, string> = {
  [LegalActionType.PASS_PRIORITY]: 'Pass Priority',
  [LegalActionType.PLAY_LAND]: 'Play Land',
  [LegalActionType.CAST_SPELL]: 'Cast Spell',
  [LegalActionType.ACTIVATE_MANA_ABILITY]: 'Activate Mana',
  [LegalActionType.DECLARE_ATTACKERS]: 'Declare Attackers',
  [LegalActionType.DECLARE_BLOCKERS]: 'Declare Blockers',
  [LegalActionType.CHOOSE_FIRST_PLAYER]: 'Choose First',
  [LegalActionType.KEEP_HAND]: 'Keep Hand',
  [LegalActionType.MULLIGAN]: 'Mulligan',
  [LegalActionType.CONCEDE]: 'Concede',
};

function buildSimpleAction(action: LegalAction): ActionInput | null {
  switch (action.actionType) {
    case LegalActionType.PASS_PRIORITY: return { passPriority: {} };
    case LegalActionType.KEEP_HAND: return { keepHand: {} };
    case LegalActionType.MULLIGAN: return { mulligan: {} };
    case LegalActionType.CONCEDE: return { concede: {} };
    case LegalActionType.PLAY_LAND: return action.objectId !== undefined ? { playLand: { objectId: action.objectId } } : null;
    default: return null;
  }
}

export function ActionBar({ legalActions, isMyTurn, isSubmitting, onAction, gameStatus }: ActionBarProps) {
  const { passPriority, concede, isLoading } = useGameActions();
  const gameState = useGameStore((s) => s.gameState);
  const setAutoPassUntilTurn = useGameStore((s) => s.setAutoPassUntilTurn);
  const [menuOpen, setMenuOpen] = useState(false);
  const isPregame = gameStatus === GameStatus.CHOOSING_PLAY_ORDER || gameStatus === GameStatus.MULLIGAN;
  const canPass = legalActions.some((la) => la.actionType === LegalActionType.PASS_PRIORITY);

  // During pregame, show all actions as buttons
  const visibleActions = isPregame
    ? legalActions
    : legalActions.filter((la) => !hiddenActions.has(la.actionType));

  return (
    <div className="panel action-bar" style={{ display: 'flex', gap: '6px', padding: '6px 10px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius)', alignItems: 'center' }} role="toolbar" aria-label="Game actions">
      {!isMyTurn && !isPregame && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Waiting…</span>}

      {/* Pregame / other visible actions */}
      {visibleActions.map((la, i) => {
        const actionInput = buildSimpleAction(la);
        return (
          <Button
            key={`${la.actionType}-${la.objectId ?? i}`}
            variant="secondary"
            disabled={!actionInput || isSubmitting}
            loading={isSubmitting}
            onClick={() => actionInput && onAction(actionInput)}
            style={{ fontSize: '0.8rem', padding: '4px 10px' }}
          >
            {actionLabels[la.actionType] ?? la.actionType}
          </Button>
        );
      })}

      {/* Pass Priority + Pass Turn buttons */}
      {!isPregame && canPass && (
        <>
          <Button variant="primary" disabled={isLoading} onClick={() => passPriority()} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            Pass Priority
          </Button>
          <Button variant="primary" disabled={isLoading} onClick={() => {
            if (gameState) setAutoPassUntilTurn(gameState.turnNumber + 1);
            passPriority();
          }} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            Pass until next turn
          </Button>
        </>
      )}

      {/* Menu button with concede hidden inside */}
      {!isPregame && (
        <div style={{ position: 'relative' }}>
          <Button variant="secondary" onClick={() => setMenuOpen(!menuOpen)} style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
            ⋯
          </Button>
          {menuOpen && (
            <div style={{
              position: 'absolute', bottom: '100%', right: 0, marginBottom: '4px',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)', padding: '4px', zIndex: 50, minWidth: '120px',
            }}>
              <button
                onClick={() => { concede(); setMenuOpen(false); }}
                disabled={isLoading}
                style={{
                  width: '100%', padding: '6px 12px', background: 'none', border: 'none',
                  color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left',
                  borderRadius: 'var(--radius)',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-bg-secondary)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                Concede
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
