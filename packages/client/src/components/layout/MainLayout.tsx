import React from 'react';
import { useLayoutStore } from '../../stores/layoutStore';
import { GlobalDialogs } from '../common/GlobalDialogs';

interface MainLayoutProps {
  header: React.ReactNode;
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  header,
  leftPanel,
  centerPanel,
  rightPanel,
  bottomPanel,
}) => {
  const {
    sidebarLeftVisible,
    sidebarRightVisible,
    bottomPanelVisible,
    sidebarLeftWidth,
    sidebarRightWidth,
    bottomPanelHeight
  } = useLayoutStore();

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-dark text-slate-300 overflow-hidden font-display">
      {/* Header - h-10 */}
      <header className="h-10 w-full shrink-0 z-50">
        {header}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left + Center Column (Hierarchy + Viewport + Bottom) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Row: Hierarchy + Viewport */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar (Hierarchy) - only extends to viewport height */}
            {sidebarLeftVisible && (
              <aside
                style={{ width: sidebarLeftWidth }}
                className="shrink-0 flex flex-col border-r border-border-dark bg-panel-dark"
              >
                {leftPanel}
              </aside>
            )}

            {/* 3D Viewport */}
            <section className="flex-1 relative bg-black overflow-hidden border-b border-border-dark">
              {centerPanel}
            </section>
          </div>

          {/* Bottom Panel (Project) - spans full width of left+center */}
          {bottomPanelVisible && (
            <section
              style={{ height: bottomPanelHeight }}
              className="shrink-0 flex flex-col border-t border-border-dark bg-panel-dark"
            >
              {bottomPanel}
            </section>
          )}
        </div>

        {/* Right Sidebar (Inspector) - full height */}
        {sidebarRightVisible && (
          <aside
            style={{ width: sidebarRightWidth }}
            className="shrink-0 flex flex-col border-l border-border-dark bg-panel-dark overflow-y-auto custom-scrollbar"
          >
            {rightPanel}
          </aside>
        )}
      </main>

      {/* Footer Status Bar - h-6 */}
      <footer className="h-6 bg-header-dark border-t border-border-dark px-3 flex items-center justify-between text-[9px] text-slate-500 z-50 flex-shrink-0 select-none">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span className="material-symbols-outlined text-[12px]">info</span>
            <span>项目路径: Assets/Scenes/Industrial_Facility.unity</span>
          </div>
          <div className="h-3 w-px bg-border-dark"></div>
          <div className="flex items-center text-green-500 space-x-1">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            <span>同步成功 (2.4ms)</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span>FPS: 60.0</span>
          <span>Col: 2, Line: 15</span>
          <span className="font-mono">v2.4.0-PRO</span>
        </div>
      </footer>

      {/* Global Dialogs */}
      <GlobalDialogs />
    </div>
  );
};
