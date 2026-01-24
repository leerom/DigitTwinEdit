import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ToolType, CursorMode, NavigationMode, ViewMode, ModifierState } from '@/features/editor/shortcuts/types';

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

  // Tool System (NEW)
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // Cursor State (NEW)
  cursorMode: CursorMode;
  setCursorMode: (mode: CursorMode) => void;

  // Modifier Keys (NEW)
  modifiers: ModifierState;
  setModifiers: (mods: Partial<ModifierState>) => void;

  // Navigation Mode (NEW)
  navigationMode: NavigationMode;
  setNavigationMode: (mode: NavigationMode) => void;

  // View Mode (NEW)
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Renaming State (NEW)
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;

  // Global Dialog State
  showDeleteConfirmation: boolean;
  setDeleteConfirmation: (visible: boolean) => void;

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

      // Tool System (NEW)
      activeTool: 'hand',
      cursorMode: 'default',
      modifiers: {
        ctrl: false,
        shift: false,
        alt: false,
      },
      navigationMode: 'orbit',
      viewMode: '3D',
      renamingId: null,
      showDeleteConfirmation: false,

      // Actions
      setMode: (mode) => set({ mode }),
      setRenderMode: (renderMode) => set({ renderMode }),

      // Tool System Actions (NEW)
      setActiveTool: (tool) => set({ activeTool: tool }),

      setCursorMode: (mode) => set({ cursorMode: mode }),

      setModifiers: (mods) =>
        set((state) => ({
          modifiers: { ...state.modifiers, ...mods },
        })),

      setNavigationMode: (mode) => set({ navigationMode: mode }),

      setViewMode: (mode) => set({ viewMode: mode }),

      setRenamingId: (id) => set({ renamingId: id }),

      setDeleteConfirmation: (visible) => set({ showDeleteConfirmation: visible }),

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
