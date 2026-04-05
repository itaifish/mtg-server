import { LegalActionType, GameStatus } from '@/types/enums';
import type { LegalAction } from '@/types/models';
import type { ActionInput } from '@/types/actions';
import { useGameActions } from '@/hooks/useGameActions';
import { Button } from '@/components/shared';

interface ActionBarProps {
  legalActions: LegalAction[];
  isMyTurn: boolean;
  isSubmitting: boolean;
  onAction: (action: ActionInput) => void;
  gameStatus?: GameStatus;
}

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

/** Actions handled by dedicated panels (PregamePanel, CombatPanel, ManaPanel) */
const panelHandledActions = new Set<string>([
  LegalActionType.CHOOSE_FIRST_PLAYER,
  LegalActionType.KEEP_HAND,
  LegalActionType.MULLIGAN,
  LegalActionType.DECLARE_ATTACKERS,
  LegalActionType.DECLARE_BLOCKERS,
  LegalActionType.ACTIVATE_MANA_ABILITY,
  LegalActionType.CAST_SPELL,
]);

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
  const { concede, isLoading: hookLoading } = useGameActions();
  const isPregame = gameStatus === GameStatus.CHOOSING_PLAY_ORDER || gameStatus === GameStatus.MULLIGAN;

  // Filter out actions handled by dedicated panels during in-game
  const visibleActions = isPregame
    ? legalActions
    : legalActions.filter((la) => !panelHandledActions.has(la.actionType));

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius)', flexWrap: 'wrap', alignItems: 'center' }} role="toolbar" aria-label="Game actions">
      {!isMyTurn && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Waiting for opponent…</span>}
      {visibleActions.map((la, i) => {
        const actionInput = buildSimpleAction(la);
        return (
          <Button
            key={`${la.actionType}-${la.objectId ?? i}`}
            variant={la.actionType === LegalActionType.CONCEDE ? 'danger' : la.actionType === LegalActionType.PASS_PRIORITY ? 'primary' : 'secondary'}
            disabled={!actionInput || isSubmitting}
            loading={isSubmitting}
            onClick={() => actionInput && onAction(actionInput)}
          >
            {actionLabels[la.actionType] ?? la.actionType}
          </Button>
        );
      })}
      {!isPregame && !legalActions.some((la) => la.actionType === LegalActionType.CONCEDE) && (
        <Button variant="danger" disabled={hookLoading} onClick={() => concede()}>
          Concede
        </Button>
      )}
    </div>
  );
}
