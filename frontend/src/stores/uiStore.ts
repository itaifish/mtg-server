import { create } from 'zustand';
import type { LegalActionType } from '../types/enums';
import type { SpellTarget } from '../types/actions';

export interface TargetingMode {
  actionType: LegalActionType;
  requiredTargets: number;
  selectedTargets: SpellTarget[];
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export interface UiState {
  selectedObjectId: number | null;
  hoveredObjectId: number | null;
  targetingMode: TargetingMode | null;
  showSettings: boolean;
  showDeckBuilder: boolean;
  cameraPosition: 'default' | 'overhead' | 'closeup';
  chatMessages: ChatMessage[];
}

export interface UiActions {
  selectObject: (id: number) => void;
  deselectObject: () => void;
  hoverObject: (id: number) => void;
  unhoverObject: () => void;
  enterTargetingMode: (config: Omit<TargetingMode, 'selectedTargets'>) => void;
  addTarget: (target: SpellTarget) => void;
  removeTarget: (target: SpellTarget) => void;
  exitTargetingMode: () => void;
  toggleSettings: () => void;
  toggleDeckBuilder: () => void;
  setCameraPosition: (pos: UiState['cameraPosition']) => void;
  addChatMessage: (msg: ChatMessage) => void;
  reset: () => void;
}

const initialState: UiState = {
  selectedObjectId: null,
  hoveredObjectId: null,
  targetingMode: null,
  showSettings: false,
  showDeckBuilder: false,
  cameraPosition: 'default',
  chatMessages: [],
};

function targetsEqual(a: SpellTarget, b: SpellTarget): boolean {
  if ('player' in a && 'player' in b) return a.player.playerId === b.player.playerId;
  if ('object' in a && 'object' in b) return a.object.objectId === b.object.objectId;
  return false;
}

export const useUiStore = create<UiState & UiActions>()((set, get) => ({
  ...initialState,

  selectObject: (id) => set({ selectedObjectId: id }),
  deselectObject: () => set({ selectedObjectId: null }),
  hoverObject: (id) => set({ hoveredObjectId: id }),
  unhoverObject: () => set({ hoveredObjectId: null }),

  enterTargetingMode: (config) =>
    set({ targetingMode: { ...config, selectedTargets: [] } }),

  addTarget: (target) => {
    const { targetingMode } = get();
    if (!targetingMode) return;
    set({
      targetingMode: {
        ...targetingMode,
        selectedTargets: [...targetingMode.selectedTargets, target],
      },
    });
  },

  removeTarget: (target) => {
    const { targetingMode } = get();
    if (!targetingMode) return;
    set({
      targetingMode: {
        ...targetingMode,
        selectedTargets: targetingMode.selectedTargets.filter(
          (t) => !targetsEqual(t, target),
        ),
      },
    });
  },

  exitTargetingMode: () => set({ targetingMode: null }),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  toggleDeckBuilder: () => set((s) => ({ showDeckBuilder: !s.showDeckBuilder })),
  setCameraPosition: (pos) => set({ cameraPosition: pos }),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  reset: () => set(initialState),
}));
