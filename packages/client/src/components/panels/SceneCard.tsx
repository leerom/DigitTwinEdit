import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import type { Scene } from '@digittwinedit/shared';
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu';

interface SceneCardProps {
  scene: Scene;
  selected?: boolean;
  onSelect?: () => void;
  onNew?: () => void;
  onOpen?: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  selected,
  onSelect,
  onNew,
  onOpen,
  onRename,
  onDelete,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [editedName, setEditedName] = useState(scene.name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦输入框
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRenameClick = () => {
    setIsRenaming(true);
    setEditedName(scene.name);
  };

  const handleRenameSubmit = () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== scene.name) {
      onRename?.(trimmedName);
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setEditedName(scene.name);
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const menuItems: ContextMenuItem[] = [
    {
      label: '新建',
      icon: 'add',
      onClick: () => onNew?.(),
    },
    {
      label: '打开',
      icon: 'play_arrow',
      onClick: () => onOpen?.(),
    },
    {
      label: '重命名',
      icon: 'edit',
      onClick: handleRenameClick,
      disabled: !onRename,
    },
    {
      label: '删除',
      icon: 'delete',
      onClick: () => onDelete?.(),
      danger: true,
      disabled: !onDelete,
    },
  ];

  return (
    <>
      <div
        className={clsx(
          'flex flex-col items-center p-2 rounded bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer transition-colors',
          selected && 'ring-2 ring-primary'
        )}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
      >
        <div className="w-full aspect-square bg-slate-700 rounded mb-2 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-slate-500">
            photo_library
          </span>
        </div>

        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRenameSubmit}
            className="text-xs text-slate-300 bg-slate-700 border-2 border-primary rounded px-1 w-full text-center"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-xs text-slate-300 truncate w-full text-center">
            {scene.name}
          </span>
        )}

        {scene.is_active && (
          <span className="text-[10px] text-primary mt-1">活动场景</span>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          items={menuItems}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};
