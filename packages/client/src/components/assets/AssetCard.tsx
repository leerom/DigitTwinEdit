import React, { useState, useRef, useEffect } from 'react';
import type { Asset } from '@digittwinedit/shared';
import { clsx } from 'clsx';
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu';

interface AssetCardProps {
  asset: Asset;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  selected,
  onSelect,
  onOpen,
  onRename,
  onDelete,
  onDragStart,
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [editedName, setEditedName] = useState(asset.name);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦输入框
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);
  const getIcon = () => {
    switch (asset.type) {
      case 'model':
        return 'deployed_code';
      case 'material':
        return 'texture';
      case 'texture':
        return 'image';
      default:
        return 'insert_drive_file';
    }
  };

  const getTypeLabel = () => {
    const ext = asset.name.split('.').pop()?.toUpperCase();
    return ext || asset.type.toUpperCase();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleRenameClick = () => {
    setIsRenaming(true);
    setEditedName(asset.name);
  };

  const handleRenameSubmit = () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== asset.name) {
      onRename?.(trimmedName);
    }
    setIsRenaming(false);
  };

  const handleRenameCancel = () => {
    setEditedName(asset.name);
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
      label: '打开',
      icon: 'add_box',
      onClick: () => onOpen?.(),
      disabled: !onOpen,
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
          'flex flex-col items-center space-y-1 group cursor-pointer',
          selected && 'ring-2 ring-primary rounded'
        )}
        onClick={onSelect}
        onContextMenu={handleContextMenu}
        draggable={!isRenaming}
        onDragStart={onDragStart}
      >
      <div
        className={clsx(
          'w-16 h-16 bg-bg-dark border rounded flex items-center justify-center transition-colors relative overflow-hidden',
          selected ? 'border-primary' : 'border-border-dark group-hover:border-primary'
        )}
      >
        {asset.thumbnail_path ? (
          <img
            src={asset.thumbnail_path}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="material-symbols-outlined text-3xl text-slate-600">
            {getIcon()}
          </span>
        )}
        <span className="absolute bottom-1 right-1 text-[8px] bg-primary text-white px-1 rounded">
          {getTypeLabel()}
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
            className="text-[10px] text-slate-300 bg-slate-700 border-2 border-primary rounded px-1 w-full text-center"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={clsx(
              'text-[10px] text-center w-full truncate',
              selected ? 'text-white' : 'text-slate-400 group-hover:text-white'
            )}
            title={asset.name}
          >
            {asset.name}
          </span>
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
