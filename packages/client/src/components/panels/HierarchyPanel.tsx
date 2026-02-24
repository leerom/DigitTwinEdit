import React from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useEditorStore } from '../../stores/editorStore';
import { useProjectStore } from '../../stores/projectStore';
import { ObjectType } from '../../types';
import { clsx } from 'clsx';
import { useAssetDrop } from '@/hooks/useAssetDrop';
import { useHistoryStore } from '@/stores/historyStore';
import { DeleteObjectsCommand } from '@/features/editor/commands/DeleteObjectsCommand';
import { v4 as uuidv4 } from 'uuid';

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

  const getIcon = () => {
    switch (object.type) {
      case ObjectType.CAMERA:
        return { icon: 'videocam', color: 'text-slate-500' };
      case ObjectType.LIGHT:
        return { icon: 'light_mode', color: 'text-yellow-400' };
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
          isSelected && "bg-primary/20 text-white border-l-2 border-primary"
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={handleSelect}
        onContextMenu={handleContextMenuEvent}
      >
        {/* Expand/Collapse Button */}
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
  const executeCommand = useHistoryStore((state) => state.execute);

  const [contextMenu, setContextMenu] = React.useState<{ id: string; x: number; y: number } | null>(null);

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

    // 递归深拷贝对象子树，生成新 ID
    const duplicateSubtree = (sourceId: string, newParentId: string, isRoot: boolean): string => {
      const source = useSceneStore.getState().scene.objects[sourceId];
      if (!source) return '';
      const newId = uuidv4();
      useSceneStore.getState().addObject(
        {
          ...source,
          id: newId,
          name: isRoot ? `${source.name} (复制)` : source.name,
          children: [],
          parentId: newParentId,
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
    const { id } = contextMenu;
    closeMenu();
    // 使用命令模式，支持撤销
    executeCommand(new DeleteObjectsCommand([id]));
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
        <div className="hierarchy-item text-slate-400 font-semibold mb-1">
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
