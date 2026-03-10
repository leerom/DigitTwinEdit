// packages/client/src/features/nodeMaterial/nodes/components/InputNode.tsx
import React, { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { NODE_REGISTRY } from '../nodeRegistry';
import { BaseNode } from './BaseNode';
import type { NodeRFData } from '@/types';

export const InputNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const d = data as unknown as NodeRFData;
  const typeDef = NODE_REGISTRY[d.typeKey];
  const { updateNodeData } = useReactFlow();

  const setParam = useCallback(
    (key: string, value: unknown) => {
      updateNodeData(id, { ...d, params: { ...d.params, [key]: value } });
    },
    [id, d, updateNodeData],
  );

  if (!typeDef) return null;

  const renderInline = () => {
    const p = d.params;
    const inputCls =
      'bg-bg-dark border border-border-dark text-white text-[11px] px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-accent-blue/40 nodrag';
    switch (d.typeKey) {
      case 'FloatInput':
        return (
          <input
            type="number"
            step="0.01"
            value={p.value as number ?? 0}
            onChange={(e) => setParam('value', parseFloat(e.target.value) || 0)}
            className={`w-full ${inputCls}`}
          />
        );
      case 'ColorInput':
        return (
          <div className="flex items-center gap-1.5 nodrag">
            <div
              className="w-5 h-5 rounded border border-white/20 cursor-pointer shrink-0 overflow-hidden"
            >
              <input
                type="color"
                value={p.value as string ?? '#ffffff'}
                onChange={(e) => setParam('value', e.target.value)}
                className="w-8 h-8 -translate-x-1 -translate-y-1 cursor-pointer border-0 bg-transparent p-0"
              />
            </div>
            <span className="text-slate-400 text-[10px] font-mono">
              {(p.value as string ?? '#ffffff').toUpperCase()}
            </span>
          </div>
        );
      case 'Vec2Input':
        return (
          <div className="flex gap-1 nodrag">
            {(['x', 'y'] as const).map((axis) => (
              <input
                key={axis}
                type="number"
                step="0.01"
                value={p[axis] as number ?? 0}
                onChange={(e) => setParam(axis, parseFloat(e.target.value) || 0)}
                className={`w-12 ${inputCls}`}
                placeholder={axis}
              />
            ))}
          </div>
        );
      case 'Vec3Input':
        return (
          <div className="flex flex-col gap-0.5 nodrag">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <input
                key={axis}
                type="number"
                step="0.01"
                value={p[axis] as number ?? 0}
                onChange={(e) => setParam(axis, parseFloat(e.target.value) || 0)}
                className={`w-full ${inputCls}`}
                placeholder={axis}
              />
            ))}
          </div>
        );
      case 'UVNode':
        return (
          <select
            value={p.index as number ?? 0}
            onChange={(e) => setParam('index', parseInt(e.target.value, 10))}
            className={`${inputCls} nodrag`}
          >
            <option value={0}>UV0</option>
            <option value={1}>UV1</option>
          </select>
        );
      case 'PositionNode':
      case 'NormalNode':
        return (
          <select
            value={p.space as string ?? 'local'}
            onChange={(e) => setParam('space', e.target.value)}
            className={`${inputCls} nodrag`}
          >
            <option value="local">Local</option>
            <option value="world">World</option>
            <option value="view">View</option>
          </select>
        );
      case 'TextureInput':
        return (
          <div className="text-slate-400 text-[10px] px-1 nodrag">
            {p.assetId ? `#${p.assetId}` : '未选择纹理'}
          </div>
        );
      default:
        return null;
    }
  };

  return <BaseNode typeDef={typeDef} selected={selected}>{renderInline()}</BaseNode>;
};
