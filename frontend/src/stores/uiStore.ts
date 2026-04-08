import { create } from 'zustand';
import type { AutoPassMode, GamePhase, LegalActionType } from '../types/enums';
import type { SpellTarget } from '../types/actions';
import type { TargetRequirement } from '../types/models';

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

export interface PendingCast {
  objectId: number;
  cardName: string;
  manaValue: number;
  manaCost?: string[];
  targetRequirements?: TargetRequirement[];
}

export interface UiState {
  selectedObjectId: number | null;
  hoveredObjectId: number | null;
  draggingObjectId: number | null;
  handOrder: number[];
  targetingMode: TargetingMode | null;
  pendingCast: PendingCast | null;
  manaAbilityIds: Set<number>;
  mulliganCount: number;
  showSettings: boolean;
  showDeckBuilder: boolean;
  cameraPosition: 'default' | 'overhead' | 'closeup' | 'topdown';
  autoTapLands: boolean;
  autoPassPriority: boolean;
  autoPassMode: AutoPassMode;
  autoPassStopAtPhase: GamePhase | null;
  viewingGraveyard: 'mine' | 'opponent' | null;
  chatMessages: ChatMessage[];
}

export interface UiActions {
  selectObject: (id: number) => void;
  deselectObject: () => void;
  hoverObject: (id: number) => void;
  unhoverObject: () => void;
  startDrag: (id: number) => void;
  endDrag: () => void;
  setHandOrder: (order: number[]) => void;
  enterTargetingMode: (config: Omit<TargetingMode, 'selectedTargets'>) => void;
  addTarget: (target: SpellTarget) => void;
  removeTarget: (target: SpellTarget) => void;
  exitTargetingMode: () => void;
  startCasting: (pending: PendingCast) => void;
  cancelCasting: () => void;
  setManaAbilityIds: (ids: Set<number>) => void;
  toggleSettings: () => void;
  toggleDeckBuilder: () => void;
  setCameraPosition: (pos: UiState['cameraPosition']) => void;
  toggleAutoTapLands: () => void;
  toggleAutoPassPriority: () => void;
  setAutoPassMode: (mode: AutoPassMode, stopAtPhase?: GamePhase) => void;
  cancelAutoPass: () => void;
  setViewingGraveyard: (v: 'mine' | 'opponent' | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  reset: () => void;
}

const initialState: UiState = {
  selectedObjectId: null,
  hoveredObjectId: null,
  draggingObjectId: null,
  handOrder: [],
  targetingMode: null,
  pendingCast: null,
  manaAbilityIds: new Set<number>(),
  mulliganCount: 0,
  showSettings: false,
  showDeckBuilder: false,
  cameraPosition: 'default',
  autoTapLands: false,
  autoPassPriority: false,
  autoPassMode: 'NONE' as AutoPassMode,
  autoPassStopAtPhase: null,
  viewingGraveyard: null,
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
  startDrag: (id) => set({ draggingObjectId: id }),
  endDrag: () => set({ draggingObjectId: null }),
  setHandOrder: (order) => set({ handOrder: order }),

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
  startCasting: (pending) => set({ pendingCast: pending }),
  cancelCasting: () => set({ pendingCast: null, manaAbilityIds: new Set<number>() }),
  setManaAbilityIds: (ids) => set({ manaAbilityIds: ids }),
  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  toggleDeckBuilder: () => set((s) => ({ showDeckBuilder: !s.showDeckBuilder })),
  setCameraPosition: (pos) => set({ cameraPosition: pos }),
  toggleAutoTapLands: () => set((s) => ({ autoTapLands: !s.autoTapLands })),
  toggleAutoPassPriority: () => set((s) => ({ autoPassPriority: !s.autoPassPriority })),
  setAutoPassMode: (mode: AutoPassMode, stopAtPhase?: GamePhase) => set({ autoPassMode: mode, autoPassPriority: mode !== 'NONE', autoPassStopAtPhase: stopAtPhase ?? null }),
  cancelAutoPass: () => set({ autoPassMode: 'NONE' as AutoPassMode, autoPassPriority: false, autoPassStopAtPhase: null }),
  setViewingGraveyard: (v: 'mine' | 'opponent' | null) => set({ viewingGraveyard: v }),
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  reset: () => set(initialState),
}));
