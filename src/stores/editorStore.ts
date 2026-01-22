import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type EditorMode = 'select' | 'translate' | 'rotate' | 'scale';
export type RenderMode = 'shaded' | 'wireframe' | 'hybrid';

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
}

interface EditorState {
  // Modes
  mode: EditorMode;
  renderMode: RenderMode;
  activeGizmo: 'translate' | 'rotate' | 'scale' | null; // For US2 T016

  // Selection
  selectedIds: string[];
  activeId: string | null;

  // View
  camera: CameraState;

  // Actions
  setMode: (mode: EditorMode) => void;
  setRenderMode: (mode: RenderMode) => void;
  select: (ids: string[], append?: boolean) => void;
  deselect: (ids: string[]) => void;
  clearSelection: () => void;
  setCamera: (camera: Partial<CameraState>) => void;
}

export const useEditorStore = create<EditorState>()(
  devtools(
    (set) => ({
      // Initial state
      mode: 'select',
      renderMode: 'shaded',
      activeGizmo: null,
      selectedIds: [],
      activeId: null,
      camera: {
        position: [10, 10, 10],
        target: [0, 0, 0],
      },

      // Actions
      setMode: (mode) => set({ mode }),
      setRenderMode: (renderMode) => set({ renderMode }),

      select: (ids, append = false) =>
        set((state) => {
          const newSelection = append
            ? [...new Set([...state.selectedIds, ...ids])]
            : ids;

          return {
            selectedIds: newSelection,
            activeId: newSelection.length > 0 ? newSelection[newSelection.length - 1] : null
          };
        }),

      deselect: (ids) =>
        set((state) => {
          const newSelection = state.selectedIds.filter(id => !ids.includes(id));
          return {
            selectedIds: newSelection,
            activeId: newSelection.length > 0 ? newSelection[newSelection.length - 1] : null
          };
        }),

      clearSelection: () =>
        set({ selectedIds: [], activeId: null }),

      setCamera: (cameraUpdate) =>
        set((state) => ({
          camera: { ...state.camera, ...cameraUpdate }
        })),
    }),
    { name: 'EditorStore' }
  )
);
