import React from 'react';
import { useLayoutStore } from '../../stores/layoutStore';
import { GlobalDialogs } from '../common/GlobalDialogs';
import { useResize } from '../../hooks/useResize';

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
    bottomPanelHeight,
    setSidebarLeftWidth,
    setSidebarRightWidth,
    setBottomPanelHeight,
  } = useLayoutStore();

  const leftResize = useResize('horizontal', setSidebarLeftWidth, () => sidebarLeftWidth);
  const rightResize = useResize('horizontal', (w) => setSidebarRightWidth(w), () => sidebarRightWidth, true);
  const bottomResize = useResize('vertical', setBottomPanelHeight, () => bottomPanelHeight);

  return (
    <div className="flex flex-col h-screen w-screen bg-bg-dark text-slate-300 overflow-hidden font-display">
      {/* Header */}
      <header className="h-10 w-full shrink-0 z-50">
        {header}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left + Center Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Row: Hierarchy + Viewport */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar (Hierarchy) */}
            {sidebarLeftVisible && (
              <aside
                style={{ width: sidebarLeftWidth }}
                className="shrink-0 flex flex-col border-r border-border-dark bg-panel-dark relative"
              >
                {leftPanel}
                {/* 右边框拖拽 Handle */}
                <div
                  {...leftResize.handleProps}
                  className="absolute top-0 right-0 w-1 h-full z-10 cursor-col-resize hover:bg-accent-blue/60 transition-colors"
                />
              </aside>
            )}

            {/* 3D Viewport */}
            <section className="flex-1 relative bg-black overflow-hidden border-b border-border-dark">
              {centerPanel}
            </section>
          </div>

          {/* Bottom Panel (Project) */}
          {bottomPanelVisible && (
            <section
              style={{ height: bottomPanelHeight }}
              className="shrink-0 flex flex-col border-t border-border-dark bg-panel-dark relative"
            >
              {/* 上边框拖拽 Handle */}
              <div
                {...bottomResize.handleProps}
                className="absolute top-0 left-0 w-full h-1 z-10 cursor-row-resize hover:bg-accent-blue/60 transition-colors"
              />
              {bottomPanel}
            </section>
          )}
        </div>

        {/* Right Sidebar (Inspector) */}
        {sidebarRightVisible && (
          <aside
            style={{ width: sidebarRightWidth }}
            className="shrink-0 flex flex-col border-l border-border-dark bg-panel-dark overflow-y-auto custom-scrollbar relative"
          >
            {/* 左边框拖拽 Handle */}
            <div
              {...rightResize.handleProps}
              className="absolute top-0 left-0 w-1 h-full z-10 cursor-col-resize hover:bg-accent-blue/60 transition-colors"
            />
            {rightPanel}
          </aside>
        )}
      </main>

      {/* Footer Status Bar */}
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

      <GlobalDialogs />
    </div>
  );
};
