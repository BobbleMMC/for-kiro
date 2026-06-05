import { create } from 'zustand';

export interface HistoryState {
  past: Record<string, any>[];
  present: Record<string, any> | null;
  future: Record<string, any>[];
}

interface HistoryActions {
  pushToHistory: (state: Record<string, any>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  getHistory: () => HistoryState;
}

interface HistoryStore extends HistoryState, HistoryActions {}

const MAX_HISTORY = 100; // Maximum number of history states to keep

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  past: [],
  present: null,
  future: [],

  pushToHistory: (newState: Record<string, any>) => {
    set((state) => {
      const past = [...state.past, state.present].filter((s) => s !== null);

      // Limit history size
      if (past.length > MAX_HISTORY) {
        past.shift();
      }

      return {
        past,
        present: newState,
        future: [], // Clear future history when new state is added
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.past.length === 0) {
        return state;
      }

      const newPast = [...state.past];
      const newPresent = newPast.pop() || null;
      const newFuture = [state.present || {}, ...state.future];

      return {
        past: newPast,
        present: newPresent,
        future: newFuture,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) {
        return state;
      }

      const newFuture = [...state.future];
      const newPresent = newFuture.shift() || null;
      const newPast = [...state.past, state.present || {}];

      return {
        past: newPast,
        present: newPresent,
        future: newFuture,
      };
    });
  },

  canUndo: () => {
    const state = get();
    return state.past.length > 0;
  },

  canRedo: () => {
    const state = get();
    return state.future.length > 0;
  },

  clearHistory: () => {
    set({
      past: [],
      present: null,
      future: [],
    });
  },

  getHistory: () => {
    const state = get();
    return {
      past: state.past,
      present: state.present,
      future: state.future,
    };
  },
}));

/**
 * Higher-order hook to add undo/redo support to any data
 */
export const withHistory = <T extends Record<string, any>>(
  initialData: T
): {
  data: T | null;
  pushToHistory: (newData: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: () => void;
} => {
  const historyStore = useHistoryStore();

  return {
    data: (historyStore.present as T) || initialData,
    pushToHistory: historyStore.pushToHistory,
    undo: historyStore.undo,
    redo: historyStore.redo,
    canUndo: historyStore.canUndo(),
    canRedo: historyStore.canRedo(),
    reset: historyStore.clearHistory,
  };
};
