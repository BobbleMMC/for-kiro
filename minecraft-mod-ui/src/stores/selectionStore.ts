import { create } from 'zustand';

export interface SelectedObject {
  id: string;
  type: 'block' | 'item' | 'entity' | 'recipe' | 'enchantment' | 'biome' | 'model' | 'texture';
  name: string;
  data?: Record<string, any>;
}

interface SelectionStore {
  selectedObject: SelectedObject | null;
  selectionHistory: SelectedObject[];
  selectObject: (object: SelectedObject) => void;
  deselectObject: () => void;
  updateSelectedObject: (data: Record<string, any>) => void;
  undo: () => void;
  redo: () => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedObject: null,
  selectionHistory: [],

  selectObject: (object: SelectedObject) => {
    set((state) => ({
      selectedObject: object,
      selectionHistory: [...state.selectionHistory, object],
    }));
  },

  deselectObject: () => {
    set({
      selectedObject: null,
    });
  },

  updateSelectedObject: (data: Record<string, any>) => {
    set((state) => {
      if (!state.selectedObject) return state;
      return {
        selectedObject: {
          ...state.selectedObject,
          data: { ...state.selectedObject.data, ...data },
        },
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.selectionHistory.length <= 1) return state;
      const history = state.selectionHistory.slice(0, -1);
      return {
        selectedObject: history[history.length - 1] || null,
        selectionHistory: history,
      };
    });
  },

  redo: () => {
    // Placeholder for redo functionality
    console.log('Redo not implemented yet');
  },
}));
