import React from 'react';
import { useEditorStore, EditorMode, RenderMode } from '@/stores/editorStore';
import { MousePointer2, Move, Rotate3D, Scaling, Box, Layers, Eye } from 'lucide-react';
import { clsx } from 'clsx';

export const Toolbar: React.FC = () => {
  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);
  const renderMode = useEditorStore((state) => state.renderMode);
  const setRenderMode = useEditorStore((state) => state.setRenderMode);

  const ToolButton = ({
    active,
    onClick,
    icon: Icon,
    label
  }: {
    active: boolean;
    onClick: () => void;
    icon: React.ElementType;
    label: string;
  }) => (
    <button
      onClick={onClick}
      className={clsx(
        "p-2 rounded hover:bg-white/10 transition-colors tooltip-trigger relative",
        active ? "bg-primary text-white" : "text-gray-400"
      )}
      title={label}
    >
      <Icon size={20} />
    </button>
  );

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 bg-surface border border-gray-700 rounded-lg p-1 shadow-lg pointer-events-auto z-10">
      <div className="flex flex-col gap-1 border-b border-gray-700 pb-2 mb-2">
        <ToolButton
          active={mode === 'select'}
          onClick={() => setMode('select')}
          icon={MousePointer2}
          label="Select (Q)"
        />
        <ToolButton
          active={mode === 'translate'}
          onClick={() => setMode('translate')}
          icon={Move}
          label="Translate (W)"
        />
        <ToolButton
          active={mode === 'rotate'}
          onClick={() => setMode('rotate')}
          icon={Rotate3D}
          label="Rotate (E)"
        />
        <ToolButton
          active={mode === 'scale'}
          onClick={() => setMode('scale')}
          icon={Scaling}
          label="Scale (R)"
        />
      </div>

      <div className="flex flex-col gap-1">
        <ToolButton
          active={renderMode === 'shaded'}
          onClick={() => setRenderMode('shaded')}
          icon={Box}
          label="Shaded"
        />
        <ToolButton
          active={renderMode === 'wireframe'}
          onClick={() => setRenderMode('wireframe')}
          icon={Layers}
          label="Wireframe"
        />
        <ToolButton
          active={renderMode === 'hybrid'}
          onClick={() => setRenderMode('hybrid')}
          icon={Eye}
          label="Hybrid"
        />
      </div>
    </div>
  );
};
