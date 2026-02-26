import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clsx } from 'clsx';
import type { Asset } from '@digittwinedit/shared';
import { assetsApi } from '../../api/assets.js';
import { useAssetStore } from '../../stores/assetStore.js';
import { buildNodeTree, type ModelNode } from './modelHierarchy.js';

interface Props {
  asset: Asset;
}

export const ModelHierarchyExpander: React.FC<Props> = ({ asset }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nodeTree, setNodeTree] = useState<ModelNode[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectAsset = useAssetStore((s) => s.selectAsset);
  const selectNode = useAssetStore((s) => s.selectNode);

  // 懒加载节点树（只加载一次）
  const loadHierarchy = useCallback(() => {
    if (nodeTree !== null) return; // 已加载，不重复
    setIsLoading(true);
    const url = `${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`;
    const loader = new GLTFLoader();
    loader.setWithCredentials(true);
    loader.load(
      url,
      (gltf) => {
        const tree = buildNodeTree(gltf.scene);
        setNodeTree(tree);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.error('[ModelHierarchyExpander] 加载失败:', err);
        setIsLoading(false);
        setNodeTree([]); // 空树防止重复加载
      }
    );
  }, [asset.id, asset.updated_at, nodeTree]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡到 AssetCard 的 onSelect
    if (!isExpanded) loadHierarchy();
    setIsExpanded((v) => !v);
  };

  const handleNodeClick = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    selectAsset(asset.id);
    selectNode(path);
  };

  // 点击外部时收起
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isExpanded]);

  const isEmpty = nodeTree !== null && nodeTree.length === 0;

  return (
    <div ref={containerRef} className="relative">
      {/* 展开按钮（叠加在图标角落，由父组件定位） */}
      <button
        className={clsx(
          'flex items-center justify-center w-4 h-4 rounded transition-colors',
          'bg-slate-700 hover:bg-primary text-slate-400 hover:text-white',
          isExpanded && 'bg-primary text-white'
        )}
        onClick={handleToggle}
        title="展开模型层级"
      >
        <span className="material-symbols-outlined text-[10px]">
          {isExpanded ? 'expand_more' : 'chevron_right'}
        </span>
      </button>

      {/* 节点树 Popover */}
      {isExpanded && (
        <div
          className={clsx(
            'absolute z-50 left-5 top-0 min-w-[180px] max-w-[260px]',
            'bg-[#1a1d26] border border-border-dark rounded shadow-xl',
            'text-xs text-slate-300 py-1'
          )}
        >
          {isLoading && (
            <div className="flex items-center space-x-2 px-3 py-2 text-slate-500">
              <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
              <span>加载层级...</span>
            </div>
          )}
          {isEmpty && (
            <div className="px-3 py-2 text-slate-500">无子节点</div>
          )}
          {nodeTree && nodeTree.length > 0 && (
            <NodeList nodes={nodeTree} depth={0} onNodeClick={handleNodeClick} />
          )}
        </div>
      )}
    </div>
  );
};

// 递归渲染节点列表
const NodeList: React.FC<{
  nodes: ModelNode[];
  depth: number;
  onNodeClick: (e: React.MouseEvent, path: string) => void;
}> = ({ nodes, depth, onNodeClick }) => {
  return (
    <>
      {nodes.map((node) => (
        <NodeItem key={node.path} node={node} depth={depth} onNodeClick={onNodeClick} />
      ))}
    </>
  );
};

const NodeItem: React.FC<{
  node: ModelNode;
  depth: number;
  onNodeClick: (e: React.MouseEvent, path: string) => void;
}> = ({ node, depth, onNodeClick }) => {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const selectedNodePath = useAssetStore((s) => s.selectedNodePath);
  const isSelected = selectedNodePath === node.path;

  return (
    <>
      <div
        className={clsx(
          'flex items-center space-x-1 px-2 py-0.5 cursor-pointer',
          isSelected ? 'bg-primary/20 text-white' : 'hover:bg-slate-700/50'
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={(e) => onNodeClick(e, node.path)}
      >
        {hasChildren ? (
          <span
            className="material-symbols-outlined text-[10px] text-slate-500 flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          >
            {open ? 'expand_more' : 'chevron_right'}
          </span>
        ) : (
          <span className="w-[10px] flex-shrink-0" />
        )}
        <span className="material-symbols-outlined text-[10px] text-slate-500 flex-shrink-0">
          {node.type === 'Mesh' ? 'deployed_code' : 'folder'}
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      {hasChildren && open && (
        <NodeList nodes={node.children} depth={depth + 1} onNodeClick={onNodeClick} />
      )}
    </>
  );
};
