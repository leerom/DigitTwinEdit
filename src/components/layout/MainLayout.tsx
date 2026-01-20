import React from 'react';
import { clsx } from 'clsx';

interface MainLayoutProps {
  header: React.ReactNode;
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
  className?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  header,
  leftPanel,
  centerPanel,
  rightPanel,
  bottomPanel,
  className,
}) => {
  return (
    <div className={clsx("flex flex-col h-screen w-screen bg-background text-white overflow-hidden", className)}>
      {/* Header Area */}
      <header className="h-12 border-b border-gray-700 bg-surface flex-none z-10">
        {header}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Left Panel (Hierarchy) */}
        <aside className="w-64 border-r border-gray-700 bg-surface flex flex-col flex-none resize-x overflow-hidden max-w-[400px] min-w-[200px]">
          {leftPanel}
        </aside>

        {/* Center Area (Viewport + Bottom Panel) */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Viewport */}
          <main className="flex-1 relative bg-black min-h-0">
            {centerPanel}
          </main>

          {/* Bottom Panel (Assets) */}
          <div className="h-64 border-t border-gray-700 bg-surface flex-none resize-y overflow-hidden max-h-[600px] min-h-[100px]">
            {bottomPanel}
          </div>
        </div>

        {/* Right Panel (Inspector) */}
        <aside className="w-80 border-l border-gray-700 bg-surface flex flex-col flex-none resize-x overflow-hidden max-w-[500px] min-w-[250px]">
          {rightPanel}
        </aside>
      </div>
    </div>
  );
};
