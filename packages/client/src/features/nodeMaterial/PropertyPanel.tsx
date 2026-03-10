// packages/client/src/features/nodeMaterial/PropertyPanel.tsx
import React from 'react';
import type { Node } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { NODE_REGISTRY } from './nodes/nodeRegistry';
import type { NodeRFData } from '@/types';

interface Props {
  selectedNodes: Node[];
}

export const PropertyPanel: React.FC<Props> = ({ selectedNodes }) => {
  const { updateNodeData } = useReactFlow();

  if (!selectedNodes.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-panel-dark text-slate-600 select-none">
        <span className="material-symbols-outlined text-[32px]">touch_app</span>
        <span className="text-[11px]">点击节点查看属性</span>
      </div>
    );
  }

  const node = selectedNodes[0];
  const d = node.data as unknown as NodeRFData;
  const typeDef = NODE_REGISTRY[d.typeKey];
  if (!typeDef) return null;

  const setParam = (key: string, value: unknown) => {
    updateNodeData(node.id, {
      ...d,
      params: { ...d.params, [key]: value },
    } as unknown as Record<string, unknown>);
  };

  const inputCls =
    'bg-bg-dark border border-border-dark text-white text-[11px] px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-accent-blue/40 w-full';

  return (
    <div className="flex-1 overflow-y-auto bg-panel-dark custom-scrollbar">
      {/* Section 标题 */}
      <div className="px-3 py-2 border-b border-border-dark sticky top-0 bg-panel-dark z-10">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">
          属性
        </div>
        <div className="text-[12px] text-slate-200 font-medium truncate">
          {typeDef.label}
        </div>
      </div>

      {/* 属性字段 */}
      <div className="p-3 space-y-3">
        {Object.entries(d.params).map(([key, value]) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {key}
            </label>
            {typeof value === 'number' ? (
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => setParam(key, parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            ) : typeof value === 'string' && value.startsWith('#') ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-white/20 overflow-hidden shrink-0">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setParam(key, e.target.value)}
                    className="w-8 h-8 -translate-x-1 -translate-y-1 cursor-pointer border-0 bg-transparent p-0"
                  />
                </div>
                <span className="text-[11px] text-slate-300 font-mono">{value.toUpperCase()}</span>
              </div>
            ) : typeof value === 'string' && key === 'space' ? (
              <select
                value={value}
                onChange={(e) => setParam(key, e.target.value)}
                className={inputCls}
              >
                <option value="local">Local</option>
                <option value="world">World</option>
                <option value="view">View</option>
              </select>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
