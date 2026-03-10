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
      <div className="flex-1 flex items-center justify-center text-xs text-slate-500 bg-[#0c0e14]">
        未选中节点
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
    'bg-[#1a1d25] border border-[#2d333f] text-white text-xs px-2 py-1 rounded focus:outline-none w-full';

  return (
    <div className="flex-1 overflow-y-auto bg-[#0c0e14] p-3 space-y-3 text-xs">
      <div className="text-slate-300 font-medium border-b border-[#2d333f] pb-2">
        {typeDef.label}
      </div>
      {Object.entries(d.params).map(([key, value]) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-slate-400">{key}</label>
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
              <input
                type="color"
                value={value}
                onChange={(e) => setParam(key, e.target.value)}
                className="w-8 h-6 rounded border-0 bg-transparent cursor-pointer p-0"
              />
              <span className="text-slate-300">{value}</span>
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
  );
};
