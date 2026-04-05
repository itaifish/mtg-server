import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '../uiStore';
import { LegalActionType } from '../../types/enums';
import { playerTarget, objectTarget } from '../../types/actions';

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = useUiStore.getState();
    expect(state.selectedObjectId).toBeNull();
    expect(state.hoveredObjectId).toBeNull();
    expect(state.targetingMode).toBeNull();
    expect(state.showSettings).toBe(false);
    expect(state.showDeckBuilder).toBe(false);
    expect(state.cameraPosition).toBe('default');
    expect(state.chatMessages).toEqual([]);
  });

  describe('object selection', () => {
    it('selectObject sets id', () => {
      useUiStore.getState().selectObject(42);
      expect(useUiStore.getState().selectedObjectId).toBe(42);
    });

    it('deselectObject clears id', () => {
      useUiStore.getState().selectObject(42);
      useUiStore.getState().deselectObject();
      expect(useUiStore.getState().selectedObjectId).toBeNull();
    });
  });

  describe('object hover', () => {
    it('hoverObject sets id', () => {
      useUiStore.getState().hoverObject(7);
      expect(useUiStore.getState().hoveredObjectId).toBe(7);
    });

    it('unhoverObject clears id', () => {
      useUiStore.getState().hoverObject(7);
      useUiStore.getState().unhoverObject();
      expect(useUiStore.getState().hoveredObjectId).toBeNull();
    });
  });

  describe('targeting mode', () => {
    it('enterTargetingMode sets mode with empty targets', () => {
      useUiStore.getState().enterTargetingMode({
        actionType: LegalActionType.CAST_SPELL,
        requiredTargets: 2,
      });
      const tm = useUiStore.getState().targetingMode;
      expect(tm).toEqual({
        actionType: LegalActionType.CAST_SPELL,
        requiredTargets: 2,
        selectedTargets: [],
      });
    });

    it('addTarget appends target', () => {
      useUiStore.getState().enterTargetingMode({
        actionType: LegalActionType.CAST_SPELL,
        requiredTargets: 2,
      });
      useUiStore.getState().addTarget(playerTarget('p1'));
      expect(useUiStore.getState().targetingMode?.selectedTargets).toHaveLength(1);
    });

    it('addTarget is no-op when not in targeting mode', () => {
      useUiStore.getState().addTarget(playerTarget('p1'));
      expect(useUiStore.getState().targetingMode).toBeNull();
    });

    it('removeTarget removes matching player target', () => {
      useUiStore.getState().enterTargetingMode({
        actionType: LegalActionType.CAST_SPELL,
        requiredTargets: 2,
      });
      useUiStore.getState().addTarget(playerTarget('p1'));
      useUiStore.getState().addTarget(objectTarget(10));
      useUiStore.getState().removeTarget(playerTarget('p1'));
      const targets = useUiStore.getState().targetingMode?.selectedTargets;
      expect(targets).toHaveLength(1);
      expect(targets?.[0]).toEqual(objectTarget(10));
    });

    it('removeTarget removes matching object target', () => {
      useUiStore.getState().enterTargetingMode({
        actionType: LegalActionType.CAST_SPELL,
        requiredTargets: 1,
      });
      useUiStore.getState().addTarget(objectTarget(5));
      useUiStore.getState().removeTarget(objectTarget(5));
      expect(useUiStore.getState().targetingMode?.selectedTargets).toHaveLength(0);
    });

    it('removeTarget is no-op when not in targeting mode', () => {
      useUiStore.getState().removeTarget(playerTarget('p1'));
      expect(useUiStore.getState().targetingMode).toBeNull();
    });

    it('exitTargetingMode clears targeting mode', () => {
      useUiStore.getState().enterTargetingMode({
        actionType: LegalActionType.CAST_SPELL,
        requiredTargets: 1,
      });
      useUiStore.getState().exitTargetingMode();
      expect(useUiStore.getState().targetingMode).toBeNull();
    });
  });

  describe('toggles', () => {
    it('toggleSettings flips showSettings', () => {
      useUiStore.getState().toggleSettings();
      expect(useUiStore.getState().showSettings).toBe(true);
      useUiStore.getState().toggleSettings();
      expect(useUiStore.getState().showSettings).toBe(false);
    });

    it('toggleDeckBuilder flips showDeckBuilder', () => {
      useUiStore.getState().toggleDeckBuilder();
      expect(useUiStore.getState().showDeckBuilder).toBe(true);
      useUiStore.getState().toggleDeckBuilder();
      expect(useUiStore.getState().showDeckBuilder).toBe(false);
    });
  });

  it('setCameraPosition updates position', () => {
    useUiStore.getState().setCameraPosition('overhead');
    expect(useUiStore.getState().cameraPosition).toBe('overhead');
    useUiStore.getState().setCameraPosition('closeup');
    expect(useUiStore.getState().cameraPosition).toBe('closeup');
  });

  it('addChatMessage appends message', () => {
    const msg = { id: '1', sender: 'Alice', text: 'Hello', timestamp: 1000 };
    useUiStore.getState().addChatMessage(msg);
    expect(useUiStore.getState().chatMessages).toEqual([msg]);
    const msg2 = { id: '2', sender: 'Bob', text: 'Hi', timestamp: 2000 };
    useUiStore.getState().addChatMessage(msg2);
    expect(useUiStore.getState().chatMessages).toEqual([msg, msg2]);
  });

  it('reset clears all state', () => {
    useUiStore.getState().selectObject(1);
    useUiStore.getState().hoverObject(2);
    useUiStore.getState().toggleSettings();
    useUiStore.getState().addChatMessage({ id: '1', sender: 'X', text: 'Y', timestamp: 0 });
    useUiStore.getState().reset();
    const state = useUiStore.getState();
    expect(state.selectedObjectId).toBeNull();
    expect(state.hoveredObjectId).toBeNull();
    expect(state.showSettings).toBe(false);
    expect(state.chatMessages).toEqual([]);
  });
});
