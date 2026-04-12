import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useGameActions } from '@/hooks/useGameActions';
import { Button } from '@/components/shared';

export function ChoicePanel() {
  const pendingChoice = useGameStore((s) => s.gameState?.pendingChoice);
  const playerId = useLobbyStore((s) => s.playerId);
  const { makeChoice, isLoading } = useGameActions();

  if (!pendingChoice || pendingChoice.playerId !== playerId) return null;

  return (
    <div
      role="region"
      aria-label="Player choice"
      style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}
    >
      <p style={{ margin: '0 0 12px', fontSize: '0.9rem' }}>{pendingChoice.prompt}</p>
      {pendingChoice.choiceType === 'YES_NO' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="primary" disabled={isLoading} loading={isLoading} onClick={() => makeChoice(true)}>
            Yes
          </Button>
          <Button variant="secondary" disabled={isLoading} loading={isLoading} onClick={() => makeChoice(false)}>
            No
          </Button>
        </div>
      )}
    </div>
  );
}
