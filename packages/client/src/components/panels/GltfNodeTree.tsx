import React, { useEffect, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clsx } from 'clsx';
import { assetsApi } from '../../api/assets.js';
import { useAssetStore } from '../../stores/assetStore.js';
import { useEditorStore } from '../../stores/editorStore.js';
import { buildNodeTree, ModelNode } from '../assets/modelHierarchy.js';

interface GltfNodeItemProps {
  node: ModelNode;
  sceneObjectId: string;
  depth: number;
}

const GltfNodeItem: React.FC<GltfNodeItemProps> = ({ node, sceneObjectId, depth }) => {
  const [expanded, setExpanded] = useState(true);
  const activeSubNodePath = useEditorStore((s) => s.activeSubNodePath);
  const activeId = useEditorStore((s) => s.activeId);
  const select = useEditorStore((s) => s.select);
  const setActiveSubNodePath = useEditorStore((s) => s.setActiveSubNodePath);

  const isSelected = activeSubNodePath === node.path && activeId === sceneObjectId;
  const hasChildren = node.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    select([sceneObjectId], false);
    setActiveSubNodePath(node.path);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div>
      <div
        className={clsx(
          'hierarchy-item',
          isSelected && 'bg-primary/20 text-white border-l-2 border-primary'
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-white transition-colors mr-1"
            onClick={toggleExpand}
          >
            <span className="material-symbols-outlined text-xs">
              {expanded ? 'expand_more' : 'chevron_right'}
            </span>
          </button>
        ) : (
          <span className="w-4 h-4 mr-1" />
        )}

        <span
          className={clsx(
            'material-symbols-outlined text-xs mr-2',
            isSelected ? 'text-primary' : 'text-slate-600'
          )}
        >
          {node.type === 'Mesh' ? 'deployed_code' : 'folder'}
        </span>

        <span className={clsx('truncate flex-1 text-[11px]', isSelected ? 'text-white' : 'text-slate-400')}>
          {node.name}
        </span>
      </div>

      {expanded &&
        node.children.map((child, i) => (
          <GltfNodeItem key={i} node={child} sceneObjectId={sceneObjectId} depth={depth + 1} />
        ))}
    </div>
  );
};

interface GltfNodeTreeProps {
  sceneObjectId: string;
  assetId: number;
  depth: number;
}

export const GltfNodeTree: React.FC<GltfNodeTreeProps> = ({ sceneObjectId, assetId, depth }) => {
  const [nodes, setNodes] = useState<ModelNode[] | null>(null);
  const assets = useAssetStore((s) => s.assets);
  const asset = assets.find((a) => a.id === assetId);

  useEffect(() => {
    if (!asset) return;

    const url = `${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`;
    const loader = new GLTFLoader();
    loader.setWithCredentials(true);

    let cancelled = false;
    loader.load(
      url,
      (gltf) => {
        if (cancelled) return;
        setNodes(buildNodeTree(gltf.scene));
      },
      undefined,
      (err) => {
        if (!cancelled) console.error('[GltfNodeTree] 加载失败:', err);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [assetId, asset?.updated_at]);

  if (!nodes) {
    return (
      <div
        style={{ paddingLeft: `${depth * 16 + 20}px` }}
        className="text-[10px] text-slate-600 py-1 italic"
      >
        加载中...
      </div>
    );
  }

  if (nodes.length === 0) return null;

  return (
    <div>
      {nodes.map((node, i) => (
        <GltfNodeItem key={i} node={node} sceneObjectId={sceneObjectId} depth={depth} />
      ))}
    </div>
  );
};
