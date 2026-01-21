import { create } from 'zustand';

interface LayoutState {
  sidebarLeftVisible: boolean;
  sidebarRightVisible: boolean;
  bottomPanelVisible: boolean;
  sidebarLeftWidth: number;
  sidebarRightWidth: number;
  bottomPanelHeight: number;
  themeMode: 'dark' | 'light';

  // Actions
  toggleSidebarLeft: () => void;
  toggleSidebarRight: () => void;
  toggleBottomPanel: () => void;
  setSidebarLeftWidth: (width: number) => void;
  setSidebarRightWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  // Initial state based on design requirements
  sidebarLeftVisible: true,
  sidebarRightVisible: true,
  bottomPanelVisible: true,
  sidebarLeftWidth: 256,   // Default width
  sidebarRightWidth: 320,  // Default width
  bottomPanelHeight: 256,  // Default height
  themeMode: 'dark',       // Only dark mode supported currently

  // Actions implementation
  toggleSidebarLeft: () => set((state) => ({ sidebarLeftVisible: !state.sidebarLeftVisible })),
  toggleSidebarRight: () => set((state) => ({ sidebarRightVisible: !state.sidebarRightVisible })),
  toggleBottomPanel: () => set((state) => ({ bottomPanelVisible: !state.bottomPanelVisible })),

  setSidebarLeftWidth: (width) => set({ sidebarLeftWidth: Math.max(200, Math.min(width, 500)) }),
  setSidebarRightWidth: (width) => set({ sidebarRightWidth: Math.max(240, Math.min(width, 600)) }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(100, Math.min(height, 800)) }),
}));
