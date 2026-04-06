import { useEffect, useRef } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { LegalActionType } from '@/types/enums';
import { ManaPoolDisplay, EMPTY_POOL } from './ManaPoolDisplay';
import { Button } from '@/components/shared';
import { buildManaPayment } from '@/utils/manaPayment';

/**
 * Overlay shown when a player is casting a spell.
 * Prompts them to tap lands for mana, shows the mana pool, and offers confirm/cancel.
 * When autoTapLands is enabled, automatically taps all available mana abilities then casts.
 */
export function CastingOverlay() {
  const pendingCast = useUiStore((s) => s.pendingCast);
  const cancelCasting = useUiStore((s) => s.cancelCasting);
  const autoTapLands = useUiStore((s) => s.autoTapLands);
  const legalActions = useGameStore((s) => s.legalActions);
  const gameState = useGameStore((s) => s.gameState);
  const { castSpell, activateManaAbility } = useGameActions();
  const autoTapping = useRef(false);

  const manaAbilities = legalActions.filter(
    (a) => a.actionType === LegalActionType.ACTIVATE_MANA_ABILITY && a.objectId != null,
  );
  const firstManaAbilityId = manaAbilities[0]?.objectId;

  const player = gameState?.players.find((p) => p.playerId === gameState.priorityPlayerId);
  const pool = player?.manaPool ?? EMPTY_POOL;

  // Total mana in pool
  const totalPoolMana = pool.white.unrestricted + pool.blue.unrestricted + pool.black.unrestricted
    + pool.red.unrestricted + pool.green.unrestricted + pool.colorless.unrestricted;
  const neededMana = pendingCast?.manaValue ?? 0;

  const doCast = () => {
    const payment = pendingCast!.manaCost ? buildManaPayment(pendingCast!.manaCost, pool) : [];
    castSpell(pendingCast!.objectId, payment);
    cancelCasting();
  };

  // Auto-tap: activate mana abilities until we have enough, then cast
  useEffect(() => {
    if (!pendingCast || !autoTapLands || autoTapping.current) return;
    if (totalPoolMana >= neededMana) {
      doCast();
    } else if (firstManaAbilityId != null) {
      autoTapping.current = true;
      activateManaAbility(firstManaAbilityId, 0);
    } else {
      doCast();
    }
  }, [pendingCast, autoTapLands, firstManaAbilityId, totalPoolMana, neededMana, activateManaAbility, castSpell, cancelCasting]);

  // Reset flag when legal actions update (server responded)
  useEffect(() => {
    autoTapping.current = false;
  }, [legalActions]);

  if (!pendingCast) return null;

  // When auto-tapping, show a brief status instead of the full UI
  if (autoTapLands) {
    return (
      <div style={{
        position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)', padding: '12px 16px', zIndex: 40,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)', fontSize: '0.8rem',
      }}>
        Auto-tapping lands for {pendingCast.cardName}...
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)', padding: '12px 16px', zIndex: 40,
      display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '240px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        Casting: {pendingCast.cardName}
        {pendingCast.manaCost && (
          <span style={{ marginLeft: '6px', fontSize: '0.75rem', opacity: 0.7 }}>
            ({pendingCast.manaCost.join('')})
          </span>
        )}
      </div>

      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        Tap lands to add mana, then confirm
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pool:</span>
        <ManaPoolDisplay pool={pool} compact />
      </div>

      {manaAbilities.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {manaAbilities.map((a) => (
            <Button
              key={a.objectId}
              variant="secondary"
              onClick={() => activateManaAbility(a.objectId!, 0)}
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
            >
              Tap #{a.objectId}
            </Button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={cancelCasting} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
          Cancel
        </Button>
        <Button variant="primary" onClick={doCast} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
          Cast
        </Button>
      </div>
    </div>
  );
}
