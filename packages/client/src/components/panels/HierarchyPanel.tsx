import React from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useEditorStore } from '../../stores/editorStore';
import { useProjectStore } from '../../stores/projectStore';
import { useHistoryStore } from '@/stores/historyStore';
import { ObjectType } from '../../types';
import type { MaterialSpec, MaterialType } from '@/types';
import { clsx } from 'clsx';
import { useAssetDrop } from '@/hooks/useAssetDrop';
import { v4 as uuidv4 } from 'uuid';
import { GltfNodeTree } from './GltfNodeTree';
import { BindMaterialAssetCommand } from '@/features/editor/commands/BindMaterialAssetCommand';
import { materialsApi } from '@/api/assets';
import { useAssetStore } from '../../stores/assetStore.js';
import { useMaterialStore } from '../../stores/materialStore.js';

interface HierarchyItemProps {
  id: string;
  depth: number;
  onContextMenu: (id: string, x: number, y: number) => void;
}

const HierarchyItem: React.FC<HierarchyItemProps> = React.memo(({ id, depth, onContextMenu }) => {
  const object = useSceneStore((state) => state.scene.objects[id]);
  const isSelected = useEditorStore((state) => state.selectedIds.includes(id));
  const select = useEditorStore((state) => state.select);
  const renamingId = useEditorStore((state) => state.renamingId);
  const setRenamingId = useEditorStore((state) => state.setRenamingId);
  const updateObject = useSceneStore((state) => state.updateObject);

  const [expanded, setExpanded] = React.useState(true);
  const [renameValue, setRenameValue] = React.useState('');
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isRenaming = renamingId === id;

  // 进入重命名模式时，初始化输入值并自动聚焦选中全部
  React.useEffect(() => {
    if (isRenaming && object) {
      setRenameValue(object.name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isRenaming]);

  if (!object) return null;
  const hasChildren = object.children.length > 0;
  const modelAssetId: number | null =
    object.type === ObjectType.MESH
      ? ((object.components as any)?.model?.assetId ?? null)
      : null;
  const hasModel = modelAssetId !== null;
  const isExpandable = hasChildren || hasModel;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRenaming) {
      select([id], false);
    }
  };

  const handleContextMenuEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    select([id], false);
    onContextMenu(id, e.clientX, e.clientY);
  };

  const handleRenameCommit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== object.name) {
      updateObject(id, { name: trimmed });
    }
    setRenamingId(null);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameCommit();
    } else if (e.key === 'Escape') {
      setRenamingId(null);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('assettype')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const assetType = e.dataTransfer.getData('assetType');
    if (assetType !== 'material') return;

    if (object.type !== ObjectType.MESH) return;

    const assetId = parseInt(e.dataTransfer.getData('assetId'), 10);
    if (isNaN(assetId)) return;

    try {
      const data = await materialsApi.getMaterial(assetId);
      const spec: MaterialSpec = { type: data.type as MaterialType, props: data.properties };
      useHistoryStore.getState().execute(new BindMaterialAssetCommand(id, assetId, spec));
    } catch (error) {
      console.error('Failed to bind material on drop:', error);
    }
  };

  const getIcon = () => {
    switch (object.type) {
      case ObjectType.CAMERA:
        return { icon: 'videocam', color: 'text-slate-500' };
      case ObjectType.LIGHT: {
        const lt = object.components?.light?.type;
        if (lt === 'ambient') return { icon: 'wb_twilight', color: 'text-yellow-300' };
        if (lt === 'hemisphere') return { icon: 'gradient', color: 'text-blue-300' };
        if (lt === 'point') return { icon: 'lightbulb', color: 'text-yellow-400' };
        if (lt === 'spot') return { icon: 'flashlight_on', color: 'text-yellow-400' };
        return { icon: 'light_mode', color: 'text-yellow-400' }; // directional 默认
      }
      case ObjectType.GROUP:
        return { icon: 'grid_view', color: 'text-slate-500' };
      default:
        return { icon: 'view_in_ar', color: isSelected ? 'text-primary' : 'text-slate-500' };
    }
  };

  const iconInfo = getIcon();

  return (
    <div>
      <div
        className={clsx(
          "hierarchy-item",
          isSelected && "bg-primary/20 text-white border-l-2 border-primary",
          isDragOver && object.type === ObjectType.MESH && "ring-1 ring-primary/60 bg-primary/10"
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={handleSelect}
        onContextMenu={handleContextMenuEvent}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Expand/Collapse Button */}
        {isExpandable ? (
          <button
            className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-white transition-colors mr-1"
            onClick={toggleExpand}
          >
            <span className="material-symbols-outlined text-xs">
              {expanded ? 'expand_more' : 'chevron_right'}
            </span>
          </button>
        ) : (
          <span className="w-4 h-4 mr-1"></span>
        )}

        {/* Icon */}
        <span className={clsx("mr-2 material-symbols-outlined text-xs", iconInfo.color)}>
          {iconInfo.icon}
        </span>

        {/* Lock Icon */}
        {object.locked && (
          <span className="material-symbols-outlined text-xs text-yellow-500 mr-1" title="此对象已锁定">lock</span>
        )}

        {/* 名称：重命名状态显示输入框，否则显示文字 */}
        {isRenaming ? (
          <input
            ref={inputRef}
            className="flex-1 bg-gray-800 text-white text-xs px-1 py-0 border border-blue-400 rounded outline-none min-w-0"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameCommit}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={clsx("truncate flex-1", object.locked && "text-slate-400")}>
            {object.name}
          </span>
        )}
      </div>

      {expanded && object.children.map((childId) => (
        <HierarchyItem key={childId} id={childId} depth={depth + 1} onContextMenu={onContextMenu} />
      ))}
      {expanded && hasModel && (
        <GltfNodeTree sceneObjectId={id} assetId={modelAssetId!} depth={depth + 1} />
      )}
    </div>
  );
});

export const HierarchyPanel: React.FC = () => {
  const currentSceneId = useProjectStore((state) => state.currentSceneId);
  const sceneName = useProjectStore((state) =>
    state.scenes.find((s) => s.id === currentSceneId)?.name ?? ''
  );
  const rootId = useSceneStore((state) => state.scene.root);
  const rootObject = useSceneStore((state) => state.scene.objects[rootId]);

  const setRenamingId = useEditorStore((state) => state.setRenamingId);
  const select = useEditorStore((state) => state.select);
  const setDeleteConfirmation = useEditorStore((state) => state.setDeleteConfirmation);

  const sceneRootSelected = useEditorStore((state) => state.sceneRootSelected);
  const selectSceneRoot = useEditorStore((state) => state.selectSceneRoot);
  const selectAsset = useAssetStore((state) => state.selectAsset);
  const selectMaterial = useMaterialStore((state) => state.selectMaterial);

  const [contextMenu, setContextMenu] = React.useState<{ id: string; x: number; y: number } | null>(null);

  const handleSceneRootClick = () => {
    selectSceneRoot();
    selectAsset(null);
    selectMaterial(null);
  };

  const { isDraggingOver, onDragOver, onDragLeave, onDrop } = useAssetDrop();

  const handleContextMenu = React.useCallback((id: string, x: number, y: number) => {
    setContextMenu({ id, x, y });
  }, []);

  const closeMenu = () => setContextMenu(null);

  const handleRename = () => {
    if (contextMenu) {
      setRenamingId(contextMenu.id);
    }
    closeMenu();
  };

  const handleDuplicate = () => {
    if (!contextMenu) return;
    const { id } = contextMenu;
    closeMenu();

    // 复制时顶层对象在 X/Z 方向各偏移 0.5 个单位，使副本与源对象在场景中错开
    const DUPLICATE_OFFSET = 0.5;

    // 递归深拷贝对象子树，生成新 ID
    const duplicateSubtree = (sourceId: string, newParentId: string, isRoot: boolean): string => {
      const source = useSceneStore.getState().scene.objects[sourceId];
      if (!source) return '';
      const newId = uuidv4();
      const srcPos = source.transform?.position ?? [0, 0, 0];
      const position: [number, number, number] = isRoot
        ? [srcPos[0] + DUPLICATE_OFFSET, srcPos[1], srcPos[2] + DUPLICATE_OFFSET]
        : srcPos;
      useSceneStore.getState().addObject(
        {
          ...source,
          id: newId,
          name: isRoot ? `${source.name} (复制)` : source.name,
          children: [],
          parentId: newParentId,
          transform: { ...source.transform, position },
        },
        newParentId
      );
      source.children.forEach((childId) => duplicateSubtree(childId, newId, false));
      return newId;
    };

    const obj = useSceneStore.getState().scene.objects[id];
    if (!obj || !obj.parentId) return;
    const newId = duplicateSubtree(id, obj.parentId, true);
    if (newId) {
      select([newId], false);
    }
  };

  const handleDelete = () => {
    if (!contextMenu) return;
    // 右键点击时已 select 过目标对象（handleContextMenuEvent 中），
    // 直接触发全局删除确认弹窗，与 Delete 键行为一致
    closeMenu();
    setDeleteConfirmation(true);
  };

  return (
    <div
      className={clsx(
        'flex flex-col h-full w-full bg-panel-dark flex-shrink-0',
        isDraggingOver && 'ring-2 ring-inset ring-blue-400'
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Panel Header */}
      <div className="panel-title">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-xs">account_tree</span>
          <span>层级视图 (Hierarchy)</span>
        </div>
        <button className="material-symbols-outlined text-xs hover:text-white transition-colors">add</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-1">
        {/* Scene Root Header */}
        <div
          className={clsx(
            "hierarchy-item font-semibold mb-1 cursor-pointer",
            sceneRootSelected
              ? "bg-primary/20 text-white border-l-2 border-primary"
              : "text-slate-400"
          )}
          onClick={handleSceneRootClick}
        >
          <span className="material-symbols-outlined text-xs mr-1">expand_more</span>
          <span className="material-symbols-outlined text-xs mr-2 text-blue-400">deployed_code</span>
          <span>{sceneName}</span>
        </div>

        {/* Scene Objects */}
        <div className="pl-4">
          {rootObject && rootObject.children.map((childId) => (
            <HierarchyItem key={childId} id={childId} depth={0} onContextMenu={handleContextMenu} />
          ))}
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <>
          {/* 透明遮罩：点击菜单外区域关闭 */}
          <div className="fixed inset-0 z-40" onMouseDown={closeMenu} />
          <div
            className="fixed z-50 bg-[#1e1e2e] border border-gray-700 rounded shadow-xl py-1 min-w-[120px] select-none"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
              onClick={handleRename}
            >
              <span className="material-symbols-outlined text-xs">edit</span>
              重命名
            </button>
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-2"
              onClick={handleDuplicate}
            >
              <span className="material-symbols-outlined text-xs">content_copy</span>
              复制
            </button>
            <div className="my-1 border-t border-gray-700" />
            <button
              className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2"
              onClick={handleDelete}
            >
              <span className="material-symbols-outlined text-xs">delete</span>
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
};
