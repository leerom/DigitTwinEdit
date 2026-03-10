// packages/client/src/features/nodeMaterial/nodes/components/BaseNode.tsx
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeTypeDef, NodePortDef } from '@/types';
import { CATEGORY_MAP } from '../nodeCategories';

const PORT_COLORS: Record<string, string> = {
  float: '#4ade80', int: '#86efac', bool: '#fcd34d',
  vec2: '#60a5fa', vec3: '#a78bfa', vec4: '#f472b6',
  color: '#fb923c', texture: '#38bdf8', mat4: '#94a3b8', any: '#9ca3af',
};
const pc = (type: string) => PORT_COLORS[type] ?? '#9ca3af';

interface BaseNodeProps {
  typeDef: NodeTypeDef;
  selected?: boolean;
  children?: React.ReactNode;
}

export const BaseNode: React.FC<BaseNodeProps> = ({ typeDef, selected = false, children }) => {
  const cat = CATEGORY_MAP.get(typeDef.category);
  const headerBg = cat?.color ?? '#374151';

  return (
    <div
      className={`min-w-[176px] rounded-md text-[11px] shadow-xl shadow-black/60 transition-shadow ${
        selected
          ? 'ring-2 ring-accent-blue/60 ring-offset-1 ring-offset-bg-dark border border-accent-blue'
          : 'border border-border-dark hover:border-slate-600'
      }`}
      style={{ background: '#1a1e28' }}
    >
      {/* 标题栏 */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-md select-none"
        style={{ background: headerBg }}
      >
        {cat?.icon && (
          <span className="material-symbols-outlined text-[13px] text-white/80 shrink-0">
            {cat.icon}
          </span>
        )}
        <span className="text-[11px] font-semibold text-white truncate">
          {typeDef.label}
        </span>
      </div>

      {/* 分隔线 */}
      <div className="border-b border-black/30" />

      {/* Body */}
      <div className="flex py-2 min-h-[28px]">
        {/* 左：输入 handles */}
        <div className="flex flex-col gap-2 shrink-0">
          {typeDef.inputs.map((port: NodePortDef) => (
            <div key={port.id} className="relative flex items-center h-5">
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                className="!rounded-full !w-3 !h-3 !border-2 !border-white/20 transition-transform hover:scale-125"
                style={{ background: pc(port.type) }}
              />
              <span className="ml-4 mr-2 text-slate-400 whitespace-nowrap text-[11px]">
                {port.label}
              </span>
            </div>
          ))}
        </div>

        {/* 中：内联编辑控件 */}
        {children && (
          <div className="flex-1 flex flex-col gap-1 px-2 min-w-0 justify-center">
            {children}
          </div>
        )}

        {/* 右：输出 handles */}
        <div className="flex flex-col gap-2 ml-auto shrink-0">
          {typeDef.outputs.map((port: NodePortDef) => (
            <div key={port.id} className="relative flex items-center justify-end h-5">
              <span className="mr-4 ml-2 text-slate-200 whitespace-nowrap text-[11px]">
                {port.label}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                className="!rounded-full !w-3 !h-3 !border-2 !border-white/20 transition-transform hover:scale-125"
                style={{ background: pc(port.type) }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
