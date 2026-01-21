import React from 'react';
import { useLayoutStore } from '../../stores/layoutStore';

export const Header: React.FC = () => {
  const MenuItem: React.FC<{ label: string }> = ({ label }) => (
    <button className="px-2 py-1 text-xs hover:bg-slate-700 rounded transition-colors text-slate-300">
      {label}
    </button>
  );

  return (
    <header className="h-10 bg-header-dark border-b border-border-dark flex items-center px-3 justify-between z-50 flex-shrink-0 select-none">
      {/* Left: Logo & Menu */}
      <div className="flex items-center space-x-4">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-base">deployed_code</span>
          </div>
          <span className="font-bold tracking-tight text-sm text-white">TWIN<span className="text-primary">ENGINE</span></span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border-dark"></div>

        {/* Navigation Menu */}
        <nav className="flex items-center space-x-1">
          <MenuItem label="文件" />
          <MenuItem label="编辑" />
          <MenuItem label="资产" />
          <MenuItem label="游戏对象" />
          <MenuItem label="组件" />
          <MenuItem label="窗口" />
          <MenuItem label="帮助" />
        </nav>
      </div>

      {/* Right: Scene Info & Publish Button */}
      <div className="flex items-center space-x-4">
        <div className="h-4 w-px bg-border-dark"></div>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] text-slate-500">层级: <span className="text-primary">主场景</span></span>
          <button className="bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded text-[10px] font-bold border border-primary/30 transition-all">
            发布场景
          </button>
        </div>
      </div>
    </header>
  );
};
