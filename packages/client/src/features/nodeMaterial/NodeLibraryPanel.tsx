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
    <div className="flex flex-col h-full bg-panel-dark text-xs w-full">
      {/* 面板标题 */}
      <div className="px-3 py-2 border-b border-border-dark shrink-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
          节点库
        </div>
        {/* 搜索框 */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[14px] select-none pointer-events-none">
            search
          </span>
          <input
            className="w-full bg-bg-dark border border-border-dark text-white pl-7 pr-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-accent-blue/50 text-[11px] placeholder:text-slate-600"
            placeholder="搜索节点..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 节点分类列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {NODE_CATEGORIES.map((cat) => {
          const nodes = byCategory.get(cat.key) ?? [];
          if (!nodes.length) return null;
          const isCollapsed = !!collapsed[cat.key];
          return (
            <div key={cat.key}>
              {/* 分类标题 */}
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 border-b border-border-dark/50 transition-colors group"
                onClick={() =>
                  setCollapsed((p) => ({ ...p, [cat.key]: !p[cat.key] }))
                }
              >
                {/* 左侧品类色条 */}
                <div
                  className="w-0.5 h-3.5 rounded-full shrink-0"
                  style={{ background: cat.color }}
                />
                <span
                  className="material-symbols-outlined text-[13px] select-none shrink-0"
                  style={{ color: cat.color }}
                >
                  {cat.icon}
                </span>
                <span className="text-slate-300 flex-1 text-[11px] font-medium">{cat.label}</span>
                <span className="material-symbols-outlined text-[13px] text-slate-600 group-hover:text-slate-400 select-none transition-colors">
                  {isCollapsed ? 'chevron_right' : 'expand_more'}
                </span>
              </button>

              {/* 节点项列表 */}
              {!isCollapsed &&
                nodes.map((node) => (
                  <button
                    key={node.key}
                    data-testid={`node-item-${node.key}`}
                    className="w-full text-left pl-6 pr-3 py-1.5 flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-[11px] group"
                    onDoubleClick={() => onAddNode(node.key)}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('nodeType', node.key)}
                  >
                    {/* 彩色圆点 */}
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{ background: cat.color }}
                    />
                    <span className="truncate">{node.label}</span>
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      {/* 底部提示 */}
      <div className="px-3 py-1.5 border-t border-border-dark text-[9px] text-slate-600 shrink-0">
        双击或拖拽到画布添加节点
      </div>
    </div>
  );
};
