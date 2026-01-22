import React from 'react';
import { clsx } from 'clsx';

export const ProjectPanel: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'project' | 'resources'>('project');

  return (
    <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
      {/* Panel Header with Tabs */}
      <div className="panel-title">
        <div className="flex items-center space-x-6">
          {/* Project Tab */}
          <button
            onClick={() => setActiveTab('project')}
            className={clsx(
              "flex items-center space-x-2 pb-1 -mb-2 cursor-pointer transition-colors",
              activeTab === 'project'
                ? "text-white border-b-2 border-primary"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <span className="material-symbols-outlined text-xs">folder</span>
            <span>项目</span>
          </button>

          {/* Resources Tab */}
          <button
            onClick={() => setActiveTab('resources')}
            className={clsx(
              "flex items-center space-x-2 pb-1 -mb-2 cursor-pointer transition-colors",
              activeTab === 'resources'
                ? "text-white border-b-2 border-primary"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <span className="material-symbols-outlined text-xs">category</span>
            <span>资产库</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Folder Tree */}
        <aside className="w-64 border-r border-border-dark overflow-y-auto custom-scrollbar p-2">
          <div className="space-y-1">
            {/* Assets Root */}
            <div className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-slate-800">
              <span className="material-symbols-outlined text-xs">expand_more</span>
              <span className="material-symbols-outlined text-xs text-amber-500">folder_open</span>
              <span>Assets</span>
            </div>

            {/* Subfolders */}
            <div className="pl-4 space-y-1">
              <div className="flex items-center space-x-2 text-xs text-slate-500 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-slate-800">
                <span className="material-symbols-outlined text-xs">folder</span>
                <span>Scenes</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300 bg-primary/10 px-2 py-1 rounded">
                <span className="material-symbols-outlined text-xs">folder</span>
                <span>Materials</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-slate-800">
                <span className="material-symbols-outlined text-xs">folder</span>
                <span>TwinBody</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-slate-800">
                <span className="material-symbols-outlined text-xs">folder</span>
                <span>Scripts</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content: Asset Grid */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar grid grid-cols-10 gap-4 content-start">
          {/* Scene1.json */}
          <div className="flex flex-col items-center space-y-1 group cursor-pointer">
            <div className="w-16 h-16 bg-bg-dark border border-border-dark rounded flex items-center justify-center group-hover:border-primary transition-colors relative overflow-hidden">
              <span className="material-symbols-outlined text-3xl text-slate-600">deployed_code</span>
              <span className="absolute bottom-1 right-1 text-[8px] bg-primary text-white px-1 rounded">JSON</span>
            </div>
            <span className="text-[10px] text-center w-full truncate text-slate-400 group-hover:text-white">Scene1.json</span>
          </div>

          {/* Metal_Rough.mat */}
          <div className="flex flex-col items-center space-y-1 group cursor-pointer">
            <div className="w-16 h-16 bg-bg-dark border border-border-dark rounded flex items-center justify-center group-hover:border-primary transition-colors relative">
              <span className="material-symbols-outlined text-3xl text-slate-600">texture</span>
            </div>
            <span className="text-[10px] text-center w-full truncate text-slate-400">Metal_Rough.mat</span>
          </div>

          {/* Pillar_A.fbx */}
          <div className="flex flex-col items-center space-y-1 group cursor-pointer">
            <div className="w-16 h-16 bg-bg-dark border border-border-dark rounded flex items-center justify-center group-hover:border-primary transition-colors relative">
              <span className="material-symbols-outlined text-3xl text-slate-600">deployed_code</span>
            </div>
            <span className="text-[10px] text-center w-full truncate text-slate-400">Pillar_A.fbx</span>
          </div>
        </div>
      </div>
    </div>
  );
};
