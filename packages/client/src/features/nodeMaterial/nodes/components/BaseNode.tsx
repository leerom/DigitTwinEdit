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
  const headerBg = CATEGORY_MAP.get(typeDef.category)?.color ?? '#374151';
  return (
    <div
      className={`min-w-[160px] rounded shadow-lg text-[11px] bg-[#1a1d25] border ${
        selected ? 'border-blue-400 border-2' : 'border-[#3a3f4b]'
      }`}
    >
      <div
        className="rounded-t px-3 py-1 font-semibold text-white select-none"
        style={{ background: headerBg }}
      >
        {typeDef.label}
      </div>
      <div className="flex py-1.5">
        {/* Left: input handles */}
        <div className="flex flex-col gap-1.5">
          {typeDef.inputs.map((port: NodePortDef) => (
            <div key={port.id} className="relative flex items-center h-5">
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                className="!w-2.5 !h-2.5 !border-none !rounded-sm"
                style={{ background: pc(port.type) }}
              />
              <span className="ml-3 mr-2 text-slate-400 whitespace-nowrap">{port.label}</span>
            </div>
          ))}
        </div>
        {/* Center: inline editing */}
        {children && (
          <div className="flex-1 flex flex-col gap-1 px-2 min-w-0">{children}</div>
        )}
        {/* Right: output handles */}
        <div className="flex flex-col gap-1.5 ml-auto">
          {typeDef.outputs.map((port: NodePortDef) => (
            <div key={port.id} className="relative flex items-center justify-end h-5">
              <span className="mr-3 ml-2 text-slate-300 whitespace-nowrap">{port.label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                className="!w-2.5 !h-2.5 !border-none !rounded-sm"
                style={{ background: pc(port.type) }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
