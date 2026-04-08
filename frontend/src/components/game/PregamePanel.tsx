import { useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyStore } from '@/stores/lobbyStore';
import { useGameActions } from '@/hooks/useGameActions';
import { GameStatus } from '@/types/enums';
import { Button } from '@/components/shared';

export function PregamePanel() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useLobbyStore((s) => s.playerId);
  const { chooseFirstPlayer, keepHand, mulligan, isLoading } = useGameActions();
  const [selectedCards, setSelectedCards] = useState<number[]>([]);

  if (!gameState) return null;

  if (gameState.status === GameStatus.CHOOSING_PLAY_ORDER) {
    const isChooser = gameState.playOrderChooserId === playerId;
    return (
      <div
        role="region"
        aria-label="Choose play order"
        style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Choose Who Goes First</h3>
        {isChooser ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {gameState.players.map((p) => (
              <Button
                key={p.playerId}
                variant="secondary"
                disabled={isLoading}
                loading={isLoading}
                onClick={() => chooseFirstPlayer(p.playerId)}
              >
                {p.name}
              </Button>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
            Waiting for opponent to choose…
          </p>
        )}
      </div>
    );
  }

  if (gameState.status === GameStatus.MULLIGAN) {
    const me = gameState.players.find((p) => p.playerId === playerId);
    const mulliganCount = me?.mulliganCount ?? 0;
    const hasKept = me?.hasKept ?? false;
    const hand = gameState.hand ?? [];
    const needToBottom = mulliganCount;

    const toggleCard = (objectId: number) => {
      setSelectedCards((prev) =>
        prev.includes(objectId) ? prev.filter((id) => id !== objectId) : prev.length < needToBottom ? [...prev, objectId] : prev,
      );
    };

    const handleKeep = () => {
      if (needToBottom > 0) {
        keepHand(selectedCards);
      } else {
        keepHand();
      }
      setSelectedCards([]);
    };

    const handleMulligan = () => {
      mulligan();
      setSelectedCards([]);
    };

    if (hasKept) {
      return (
        <div role="region" aria-label="Mulligan decision" style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: '0.85rem' }}>
            Hand kept. Waiting for opponent…
          </p>
        </div>
      );
    }

    return (
      <div
        role="region"
        aria-label="Mulligan decision"
        style={{ padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius)' }}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>Opening Hand</h3>
        {mulliganCount > 0 && (
          <p style={{ color: 'var(--color-gold)', margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 600 }}>
            Mulliganed {mulliganCount} time{mulliganCount > 1 ? 's' : ''} — select {needToBottom} card{needToBottom > 1 ? 's' : ''} to put on bottom
          </p>
        )}
        {needToBottom > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {hand.map((card) => {
              const isSelected = selectedCards.includes(card.objectId);
              return (
                <button
                  key={card.objectId}
                  onClick={() => toggleCard(card.objectId)}
                  style={{
                    padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer',
                    background: isSelected ? 'var(--color-danger)' : 'var(--color-bg-secondary)',
                    color: isSelected ? 'var(--color-text)' : 'var(--color-text-muted)',
                    border: isSelected ? '2px solid var(--color-danger)' : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  {card.name}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="primary"
            disabled={isLoading || (needToBottom > 0 && selectedCards.length !== needToBottom)}
            loading={isLoading}
            onClick={handleKeep}
          >
            Keep{needToBottom > 0 ? ` (${selectedCards.length}/${needToBottom} selected)` : ''}
          </Button>
          <Button variant="secondary" disabled={isLoading} loading={isLoading} onClick={handleMulligan}>
            Mulligan
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
