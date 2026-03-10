// packages/client/src/features/nodeMaterial/NodeLibraryPanel.tsx
import React, { useState, useMemo } from 'react';
import { NODE_REGISTRY } from './nodes/nodeRegistry';
import { NODE_CATEGORIES } from './nodes/nodeCategories';
import type { NodeTypeDef } from '@/types';

interface Props {
  onAddNode: (typeKey: string) => void;
}

export const NodeLibraryPanel: React.FC<Props> = ({ onAddNode }) => {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return Object.values(NODE_REGISTRY).filter(
      (n: NodeTypeDef) =>
        !q || n.label.toLowerCase().includes(q) || n.key.toLowerCase().includes(q),
    );
  }, [search]);

  const byCategory = useMemo(() => {
    const map = new Map<string, NodeTypeDef[]>();
    for (const cat of NODE_CATEGORIES) map.set(cat.key, []);
    for (const node of filtered) {
      map.get(node.category)?.push(node);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full bg-[#0c0e14] border-r border-[#2d333f] text-xs w-48 shrink-0">
      <div className="p-2 border-b border-[#2d333f]">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">
            search
          </span>
          <input
            className="w-full bg-[#1a1d25] border border-[#2d333f] text-white pl-7 pr-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-xs"
            placeholder="搜索节点..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {NODE_CATEGORIES.map((cat) => {
          const nodes = byCategory.get(cat.key) ?? [];
          if (!nodes.length) return null;
          const isCollapsed = !!collapsed[cat.key];
          return (
            <div key={cat.key}>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 border-b border-[#2d333f]/50"
                onClick={() =>
                  setCollapsed((p) => ({ ...p, [cat.key]: !p[cat.key] }))
                }
              >
                <span
                  className="material-symbols-outlined text-sm select-none"
                  style={{ color: cat.color }}
                >
                  {cat.icon}
                </span>
                <span className="text-slate-300 flex-1 text-[11px]">{cat.label}</span>
                <span className="material-symbols-outlined text-sm text-slate-500 select-none">
                  {isCollapsed ? 'chevron_right' : 'expand_more'}
                </span>
              </button>
              {!isCollapsed &&
                nodes.map((node) => (
                  <button
                    key={node.key}
                    data-testid={`node-item-${node.key}`}
                    className="w-full text-left px-4 py-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-[11px]"
                    onDoubleClick={() => onAddNode(node.key)}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('nodeType', node.key)}
                  >
                    {node.label}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
