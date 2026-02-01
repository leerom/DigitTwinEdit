import React from 'react';
import type { Asset } from '@digittwinedit/shared';
import { clsx } from 'clsx';

interface AssetCardProps {
  asset: Asset;
  selected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  selected,
  onSelect,
  onDelete,
  onDragStart,
}) => {
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

  return (
    <div
      className={clsx(
        'flex flex-col items-center space-y-1 group cursor-pointer',
        selected && 'ring-2 ring-primary rounded'
      )}
      onClick={onSelect}
      draggable
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

      <span
        className={clsx(
          'text-[10px] text-center w-full truncate',
          selected ? 'text-white' : 'text-slate-400 group-hover:text-white'
        )}
        title={asset.name}
      >
        {asset.name}
      </span>

      {/* 右键菜单或删除按钮 */}
      {onDelete && (
        <button
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 rounded-full p-0.5"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <span className="material-symbols-outlined text-xs text-white">close</span>
        </button>
      )}
    </div>
  );
};
