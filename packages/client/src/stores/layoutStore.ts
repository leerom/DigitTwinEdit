import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarLeftVisible: true,
      sidebarRightVisible: true,
      bottomPanelVisible: true,
      sidebarLeftWidth: 256,
      sidebarRightWidth: 320,
      bottomPanelHeight: 256,
      themeMode: 'dark',

      toggleSidebarLeft: () => set((state) => ({ sidebarLeftVisible: !state.sidebarLeftVisible })),
      toggleSidebarRight: () => set((state) => ({ sidebarRightVisible: !state.sidebarRightVisible })),
      toggleBottomPanel: () => set((state) => ({ bottomPanelVisible: !state.bottomPanelVisible })),

      setSidebarLeftWidth: (width) => set({ sidebarLeftWidth: Math.max(200, Math.min(width, 500)) }),
      setSidebarRightWidth: (width) => set({ sidebarRightWidth: Math.max(240, Math.min(width, 600)) }),
      setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(100, Math.min(height, 800)) }),
    }),
    {
      name: 'digittwinedit-layout',
      // 仅持久化尺寸和显隐，不持久化 themeMode（留给未来主题系统）
      partialize: (state) => ({
        sidebarLeftVisible: state.sidebarLeftVisible,
        sidebarRightVisible: state.sidebarRightVisible,
        bottomPanelVisible: state.bottomPanelVisible,
        sidebarLeftWidth: state.sidebarLeftWidth,
        sidebarRightWidth: state.sidebarRightWidth,
        bottomPanelHeight: state.bottomPanelHeight,
      }),
    }
  )
);
