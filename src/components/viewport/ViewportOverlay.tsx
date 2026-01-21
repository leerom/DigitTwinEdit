import React from 'react';
import { clsx } from 'clsx';
import { useEditorStore } from '../../stores/editorStore';

export const ViewportOverlay: React.FC = () => {
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);
  const renderMode = useEditorStore((state) => state.renderMode);
  const setRenderMode = useEditorStore((state) => state.setRenderMode);

  // Tool button - transparent glass style matching code.html
  const ToolBtn = ({
    icon,
    active,
    onClick,
    title,
  }: {
    icon: string;
    active: boolean;
    onClick: () => void;
    title: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        "w-7 h-7 flex items-center justify-center rounded transition-colors",
        active ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-slate-400"
      )}
    >
      <span className="material-symbols-outlined">{icon}</span>
    </button>
  );

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>

      {/* Top Left: Tool Buttons & Coordinate Mode */}
      <div className="absolute flex space-x-2 pointer-events-auto" style={{ top: '16px', left: '16px' }}>
        {/* Transform Tools - Horizontal layout */}
        <div className="bg-black/60 backdrop-blur border border-white/10 rounded p-0.5 flex">
          <ToolBtn
            icon="pan_tool"
            title="Hand Tool (Q)"
            active={mode === 'select'}
            onClick={() => setMode('select')}
          />
          <ToolBtn
            icon="open_with"
            title="Move Tool (W)"
            active={mode === 'translate'}
            onClick={() => setMode('translate')}
          />
          <ToolBtn
            icon="sync"
            title="Rotate Tool (E)"
            active={mode === 'rotate'}
            onClick={() => setMode('rotate')}
          />
          <ToolBtn
            icon="aspect_ratio"
            title="Scale Tool (R)"
            active={mode === 'scale'}
            onClick={() => setMode('scale')}
          />
        </div>

        {/* Coordinate System Display */}
        <div className="bg-black/60 backdrop-blur border border-white/10 rounded px-3 flex items-center text-[10px] text-slate-400">
          <span className="mr-2">坐标系:</span>
          <span className="text-white">Global</span>
        </div>
      </div>

      {/* Top Right: Stats & Render Mode */}
      <div className="absolute text-right pointer-events-auto" style={{ top: '16px', right: '16px' }}>
        {/* Stats Panel */}
        <div className="bg-black/40 backdrop-blur text-[9px] font-mono p-2 rounded border border-white/5 text-slate-400 mb-2">
          <div>Draw Calls: 142</div>
          <div>Tris: 1.2M</div>
          <div>Verts: 2.1M</div>
        </div>

        {/* Render Mode Switcher - Text buttons */}
        <div className="bg-black/60 backdrop-blur border border-white/10 rounded flex p-0.5">
          <button
            onClick={() => setRenderMode('shaded')}
            className={clsx(
              "px-2 py-1 text-[10px] rounded-sm transition-colors",
              renderMode === 'shaded' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Shaded
          </button>
          <button
            onClick={() => setRenderMode('wireframe')}
            className={clsx(
              "px-2 py-1 text-[10px] rounded-sm transition-colors",
              renderMode === 'wireframe' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            Wireframe
          </button>
        </div>
      </div>

      {/* Bottom Right: Coordinate Axis Indicator */}
      <div className="absolute w-12 h-12 pointer-events-none" style={{ bottom: '16px', right: '16px' }}>
        <div className="relative w-full h-full opacity-60">
          {/* X Axis - Red, pointing right */}
          <div className="absolute bottom-0 right-0 w-8 h-px bg-red-500"></div>
          {/* Y Axis - Green, pointing up */}
          <div className="absolute bottom-0 right-0 h-8 w-px bg-green-500"></div>
          {/* Z Axis - Blue, diagonal */}
          <div className="absolute bottom-0 right-0 h-6 w-px bg-blue-500 rotate-45 origin-bottom"></div>
          {/* Axis Labels */}
          <span className="absolute right-10 bottom-0 text-[8px] text-red-500">X</span>
          <span className="absolute right-0 bottom-10 text-[8px] text-green-500">Y</span>
        </div>
      </div>

    </div>
  );
};
