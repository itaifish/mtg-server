import { useEffect, useRef } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useGameStore } from '@/stores/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { LegalActionType } from '@/types/enums';
import { ManaPoolDisplay, EMPTY_POOL } from './ManaPoolDisplay';
import { Button } from '@/components/shared';
import { buildManaPayment } from '@/utils/manaPayment';
import type { SpellTarget } from '@/types/actions';

export function CastingOverlay() {
  const pendingCast = useUiStore((s) => s.pendingCast);
  const cancelCasting = useUiStore((s) => s.cancelCasting);
  const autoTapLands = useUiStore((s) => s.autoTapLands);
  const targetingMode = useUiStore((s) => s.targetingMode);
  const enterTargetingMode = useUiStore((s) => s.enterTargetingMode);
  const exitTargetingMode = useUiStore((s) => s.exitTargetingMode);
  const addTarget = useUiStore((s) => s.addTarget);
  const removeTarget = useUiStore((s) => s.removeTarget);
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

  const totalPoolMana = pool.white.unrestricted + pool.blue.unrestricted + pool.black.unrestricted
    + pool.red.unrestricted + pool.green.unrestricted + pool.colorless.unrestricted;
  const neededMana = pendingCast?.manaValue ?? 0;

  const targetReqs = pendingCast?.targetRequirements ?? [];
  const needsTargets = targetReqs.length > 0;

  const doSubmit = async (targets?: SpellTarget[]) => {
    const payment = pendingCast!.manaCost ? buildManaPayment(pendingCast!.manaCost, pool) : [];
    await castSpell(pendingCast!.objectId, payment, targets);
    exitTargetingMode();
    cancelCasting();
  };

  const proceedAfterMana = () => {
    if (needsTargets) {
      enterTargetingMode({ actionType: LegalActionType.CAST_SPELL, requiredTargets: targetReqs.length });
    } else {
      doSubmit();
    }
  };

  // Auto-tap
  useEffect(() => {
    if (!pendingCast || !autoTapLands || targetingMode) return;
    if (autoTapping.current) {
      // Still waiting for mana ability to resolve
      autoTapping.current = false;
      return;
    }
    if (totalPoolMana >= neededMana) {
      proceedAfterMana();
    } else if (firstManaAbilityId != null) {
      autoTapping.current = true;
      activateManaAbility(firstManaAbilityId, 0);
    } else {
      proceedAfterMana();
    }
  }, [pendingCast, autoTapLands, firstManaAbilityId, totalPoolMana, neededMana, targetingMode, legalActions]);

  // No separate reset effect needed — handled above

  // Listen for target clicks from Card3D / PlayerPanel
  useEffect(() => {
    if (!targetingMode) return;
    const handler = (e: CustomEvent<SpellTarget>) => {
      const t = e.detail;
      const selected = useUiStore.getState().targetingMode?.selectedTargets ?? [];
      const exists = selected.some((s) =>
        ('object' in s && 'object' in t && s.object.objectId === t.object.objectId) ||
        ('player' in s && 'player' in t && s.player.playerId === t.player.playerId),
      );
      if (exists) removeTarget(t);
      else addTarget(t);
    };
    window.addEventListener('target-selected', handler as EventListener);
    return () => window.removeEventListener('target-selected', handler as EventListener);
  }, [targetingMode, addTarget, removeTarget]);

  // Clean up targeting mode on cancel
  const handleCancel = () => {
    exitTargetingMode();
    cancelCasting();
  };

  if (!pendingCast) return null;

  // Auto-tap status
  if (autoTapLands && !targetingMode) {
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

  // Target selection phase
  if (targetingMode) {
    const selected = targetingMode.selectedTargets;
    return (
      <div style={{
        position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
        background: 'var(--color-surface)', border: '1px solid var(--color-gold)',
        borderRadius: 'var(--radius)', padding: '12px 16px', zIndex: 40,
        display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '260px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          Choose targets for {pendingCast.cardName}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Click creatures or players ({selected.length}/{targetReqs.length})
        </div>
        {selected.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {selected.map((t, i) => (
              <span key={i} style={{
                fontSize: '0.7rem', background: 'var(--color-bg-secondary)',
                borderRadius: '4px', padding: '2px 6px', border: '1px solid var(--color-border)',
              }}>
                {'player' in t ? 'Player' : `#${t.object.objectId}`}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={handleCancel} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={selected.length < targetReqs.length}
            onClick={() => doSubmit(selected)}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Cast
          </Button>
        </div>
      </div>
    );
  }

  // Mana payment phase
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
            <Button key={a.objectId} variant="secondary" onClick={() => activateManaAbility(a.objectId!, 0)}
              style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
              Tap #{a.objectId}
            </Button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={handleCancel} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
          Cancel
        </Button>
        <Button variant="primary" onClick={proceedAfterMana} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
          {needsTargets ? 'Choose Targets' : 'Cast'}
        </Button>
      </div>
    </div>
  );
}
