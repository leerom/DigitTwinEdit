# Content Grid 右键菜单功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标**: 为 ProjectPanel 的 Content Grid 中的场景和资产卡片添加右键菜单，支持打开、重命名、删除操作。

**架构**: 创建通用的 ContextMenu 组件，提取 SceneCard 组件，修改 AssetCard 组件添加右键菜单和内联重命名功能。所有业务逻辑在 ProjectPanel 中处理，通过回调函数传递给卡片组件。

**技术栈**: React 19, TypeScript, Zustand, Tailwind CSS, Vitest

---

## 任务 1: 创建 ContextMenu 通用组件

**文件**:
- 创建: `packages/client/src/components/common/ContextMenu.tsx`
- 创建: `packages/client/src/components/common/ContextMenu.test.tsx`

**步骤 1: 编写失败的测试**

创建 `packages/client/src/components/common/ContextMenu.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextMenu } from './ContextMenu';

describe('ContextMenu', () => {
  it('should render menu items at specified position', () => {
    const items = [
      { label: '打开', icon: 'folder_open', onClick: vi.fn() },
      { label: '删除', icon: 'delete', onClick: vi.fn(), danger: true },
    ];

    render(
      <ContextMenu
        items={items}
        position={{ x: 100, y: 200 }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('打开')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
  });

  it('should call onClick when menu item is clicked', () => {
    const handleClick = vi.fn();
    const items = [{ label: '打开', onClick: handleClick }];

    render(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('打开'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking outside', () => {
    const handleClose = vi.fn();
    const items = [{ label: '打开', onClick: vi.fn() }];

    render(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        onClose={handleClose}
      />
    );

    fireEvent.mouseDown(document.body);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when pressing ESC key', () => {
    const handleClose = vi.fn();
    const items = [{ label: '打开', onClick: vi.fn() }];

    render(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should apply danger styling to danger items', () => {
    const items = [{ label: '删除', onClick: vi.fn(), danger: true }];

    render(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        onClose={vi.fn()}
      />
    );

    const deleteButton = screen.getByText('删除').closest('button');
    expect(deleteButton).toHaveClass('text-red-400');
  });
});
```

**步骤 2: 运行测试验证失败**

```bash
cd .worktrees/context-menu
pnpm --filter client test ContextMenu
```

预期: 失败，提示 ContextMenu 模块不存在

**步骤 3: 实现 ContextMenu 组件**

创建 `packages/client/src/components/common/ContextMenu.tsx`:

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  position,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // 边界检测和位置调整
  useEffect(() => {
    if (!menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // 右侧边界检测
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 8;
    }

    // 底部边界检测
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 8;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // ESC 键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] bg-slate-800 border border-slate-700 rounded-md shadow-lg py-1"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <button
            className={clsx(
              'w-full flex items-center space-x-2 px-3 py-2 text-sm transition-colors',
              item.disabled
                ? 'text-slate-600 cursor-not-allowed'
                : item.danger
                ? 'text-red-400 hover:bg-slate-700 hover:text-red-300'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            )}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
          >
            {item.icon && (
              <span className="material-symbols-outlined text-base">
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </button>
          {item.divider && <div className="border-t border-slate-700 my-1" />}
        </React.Fragment>
      ))}
    </div>
  );
};
```

**步骤 4: 运行测试验证通过**

```bash
cd .worktrees/context-menu
pnpm --filter client test ContextMenu
```

预期: 全部通过（5 个测试）

**步骤 5: 提交**

```bash
cd .worktrees/context-menu
git add packages/client/src/components/common/ContextMenu.tsx packages/client/src/components/common/ContextMenu.test.tsx
git commit -m "feat: add ContextMenu component with tests

- Create reusable context menu component
- Support menu items with icons and danger styling
- Auto-adjust position to stay within viewport
- Close on outside click and ESC key

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 任务 2: 创建 SceneCard 组件

**文件**:
- 创建: `packages/client/src/components/panels/SceneCard.tsx`
- 创建: `packages/client/src/components/panels/SceneCard.test.tsx`

**步骤 1: 编写失败的测试**

创建 `packages/client/src/components/panels/SceneCard.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneCard } from './SceneCard';

const mockScene = {
  id: 1,
  project_id: 1,
  name: 'Test Scene',
  is_active: false,
  data: {},
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('SceneCard', () => {
  it('should render scene name', () => {
    render(<SceneCard scene={mockScene} />);
    expect(screen.getByText('Test Scene')).toBeInTheDocument();
  });

  it('should show active badge for active scene', () => {
    const activeScene = { ...mockScene, is_active: true };
    render(<SceneCard scene={activeScene} />);
    expect(screen.getByText('活动场景')).toBeInTheDocument();
  });

  it('should show context menu on right click', () => {
    render(<SceneCard scene={mockScene} />);
    const card = screen.getByText('Test Scene').closest('div');

    fireEvent.contextMenu(card!);

    expect(screen.getByText('打开')).toBeInTheDocument();
    expect(screen.getByText('重命名')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
  });

  it('should call onOpen when clicking open menu item', () => {
    const handleOpen = vi.fn();
    render(<SceneCard scene={mockScene} onOpen={handleOpen} />);

    fireEvent.contextMenu(screen.getByText('Test Scene').closest('div')!);
    fireEvent.click(screen.getByText('打开'));

    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it('should enter rename mode when clicking rename', () => {
    render(<SceneCard scene={mockScene} onRename={vi.fn()} />);

    fireEvent.contextMenu(screen.getByText('Test Scene').closest('div')!);
    fireEvent.click(screen.getByText('重命名'));

    const input = screen.getByDisplayValue('Test Scene');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('should save new name on Enter key', () => {
    const handleRename = vi.fn();
    render(<SceneCard scene={mockScene} onRename={handleRename} />);

    fireEvent.contextMenu(screen.getByText('Test Scene').closest('div')!);
    fireEvent.click(screen.getByText('重命名'));

    const input = screen.getByDisplayValue('Test Scene');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleRename).toHaveBeenCalledWith('New Name');
  });

  it('should cancel rename on ESC key', () => {
    const handleRename = vi.fn();
    render(<SceneCard scene={mockScene} onRename={handleRename} />);

    fireEvent.contextMenu(screen.getByText('Test Scene').closest('div')!);
    fireEvent.click(screen.getByText('重命名'));

    const input = screen.getByDisplayValue('Test Scene');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(handleRename).not.toHaveBeenCalled();
    expect(screen.getByText('Test Scene')).toBeInTheDocument();
  });
});
```

**步骤 2: 运行测试验证失败**

```bash
cd .worktrees/context-menu
pnpm --filter client test SceneCard
```

预期: 失败，SceneCard 模块不存在

**步骤 3: 实现 SceneCard 组件**

创建 `packages/client/src/components/panels/SceneCard.tsx`:

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import type { Scene } from '@digittwinedit/shared';
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu';

interface SceneCardProps {
  scene: Scene;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  selected,
  onSelect,
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
```

**步骤 4: 运行测试验证通过**

```bash
cd .worktrees/context-menu
pnpm --filter client test SceneCard
```

预期: 全部通过（7 个测试）

**步骤 5: 提交**

```bash
cd .worktrees/context-menu
git add packages/client/src/components/panels/SceneCard.tsx packages/client/src/components/panels/SceneCard.test.tsx
git commit -m "feat: add SceneCard component with context menu

- Extract scene card from ProjectPanel
- Add right-click context menu
- Support inline rename with Enter/ESC
- Show active scene badge

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 任务 3: 修改 AssetCard 添加右键菜单和重命名

**文件**:
- 修改: `packages/client/src/components/assets/AssetCard.tsx`
- 修改: `packages/client/src/components/assets/AssetCard.test.tsx` (如果存在)
- 创建: `packages/client/src/components/assets/AssetCard.test.tsx` (如果不存在)

**步骤 1: 编写新测试**

修改或创建 `packages/client/src/components/assets/AssetCard.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetCard } from './AssetCard';

const mockAsset = {
  id: 1,
  project_id: 1,
  name: 'test-model.glb',
  type: 'model' as const,
  file_path: '/uploads/test.glb',
  file_size: 1024,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('AssetCard', () => {
  it('should render asset name', () => {
    render(<AssetCard asset={mockAsset} />);
    expect(screen.getByText('test-model.glb')).toBeInTheDocument();
  });

  it('should show context menu on right click', () => {
    render(<AssetCard asset={mockAsset} />);
    const card = screen.getByText('test-model.glb').closest('div');

    fireEvent.contextMenu(card!);

    expect(screen.getByText('打开')).toBeInTheDocument();
    expect(screen.getByText('重命名')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
  });

  it('should call onOpen when clicking open menu item', () => {
    const handleOpen = vi.fn();
    render(<AssetCard asset={mockAsset} onOpen={handleOpen} />);

    fireEvent.contextMenu(screen.getByText('test-model.glb').closest('div')!);
    fireEvent.click(screen.getByText('打开'));

    expect(handleOpen).toHaveBeenCalledTimes(1);
  });

  it('should enter rename mode when clicking rename', () => {
    render(<AssetCard asset={mockAsset} onRename={vi.fn()} />);

    fireEvent.contextMenu(screen.getByText('test-model.glb').closest('div')!);
    fireEvent.click(screen.getByText('重命名'));

    const input = screen.getByDisplayValue('test-model.glb');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('should preserve drag functionality', () => {
    const handleDragStart = vi.fn();
    render(<AssetCard asset={mockAsset} onDragStart={handleDragStart} />);

    const card = screen.getByText('test-model.glb').closest('div');
    fireEvent.dragStart(card!);

    expect(handleDragStart).toHaveBeenCalled();
  });
});
```

**步骤 2: 运行测试验证失败**

```bash
cd .worktrees/context-menu
pnpm --filter client test AssetCard
```

预期: 部分测试失败（右键菜单和重命名功能尚未实现）

**步骤 3: 修改 AssetCard 组件**

修改 `packages/client/src/components/assets/AssetCard.tsx`:

```typescript
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
```

**步骤 4: 运行测试验证通过**

```bash
cd .worktrees/context-menu
pnpm --filter client test AssetCard
```

预期: 全部通过

**步骤 5: 提交**

```bash
cd .worktrees/context-menu
git add packages/client/src/components/assets/AssetCard.tsx packages/client/src/components/assets/AssetCard.test.tsx
git commit -m "feat: add context menu and rename to AssetCard

- Add right-click context menu support
- Implement inline rename functionality
- Preserve existing drag functionality
- Remove old delete button (now in context menu)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 任务 4: 扩展 projectStore

**文件**:
- 修改: `packages/client/src/stores/projectStore.ts`
- 修改: `packages/client/src/stores/projectStore.test.ts` (如果存在，添加新测试)

**步骤 1: 编写新测试**

在 `packages/client/src/stores/projectStore.test.ts` 中添加测试（如果文件不存在则创建）:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from './projectStore';
import { api } from '../lib/api';

vi.mock('../lib/api');

describe('projectStore - scene operations', () => {
  beforeEach(() => {
    useProjectStore.setState({
      scenes: [
        { id: 1, name: 'Scene 1', is_active: true, project_id: 1, data: {}, created_at: '', updated_at: '' },
        { id: 2, name: 'Scene 2', is_active: false, project_id: 1, data: {}, created_at: '', updated_at: '' },
      ],
      currentScene: null,
    });
    vi.clearAllMocks();
  });

  it('should activate scene', async () => {
    const mockResponse = { data: { id: 2, name: 'Scene 2', is_active: true } };
    vi.mocked(api.put).mockResolvedValue(mockResponse);

    await useProjectStore.getState().activateScene(1, 2);

    expect(api.put).toHaveBeenCalledWith('/projects/1/scenes/2/activate');

    const state = useProjectStore.getState();
    expect(state.scenes.find(s => s.id === 1)?.is_active).toBe(false);
    expect(state.scenes.find(s => s.id === 2)?.is_active).toBe(true);
  });

  it('should update scene', async () => {
    const mockResponse = { data: { id: 1, name: 'Updated Scene', is_active: true } };
    vi.mocked(api.put).mockResolvedValue(mockResponse);

    await useProjectStore.getState().updateScene(1, { name: 'Updated Scene' });

    expect(api.put).toHaveBeenCalledWith('/scenes/1', { name: 'Updated Scene' });

    const state = useProjectStore.getState();
    expect(state.scenes.find(s => s.id === 1)?.name).toBe('Updated Scene');
  });
});
```

**步骤 2: 运行测试验证失败**

```bash
cd .worktrees/context-menu
pnpm --filter client test projectStore
```

预期: 新测试失败（方法未实现）

**步骤 3: 实现新方法**

修改 `packages/client/src/stores/projectStore.ts`，添加以下方法:

```typescript
// 在 projectStore 的 actions 部分添加

activateScene: async (projectId: number, sceneId: number) => {
  try {
    const response = await api.put(`/projects/${projectId}/scenes/${sceneId}/activate`);
    set((state) => ({
      scenes: state.scenes.map((s) => ({
        ...s,
        is_active: s.id === sceneId,
      })),
      currentScene: response.data,
    }));
  } catch (error) {
    console.error('Failed to activate scene:', error);
    throw error;
  }
},

updateScene: async (sceneId: number, data: Partial<Scene>) => {
  try {
    const response = await api.put(`/scenes/${sceneId}`, data);
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === sceneId ? { ...s, ...response.data } : s
      ),
    }));
  } catch (error) {
    console.error('Failed to update scene:', error);
    throw error;
  }
},
```

**步骤 4: 运行测试验证通过**

```bash
cd .worktrees/context-menu
pnpm --filter client test projectStore
```

预期: 全部通过

**步骤 5: 提交**

```bash
cd .worktrees/context-menu
git add packages/client/src/stores/projectStore.ts packages/client/src/stores/projectStore.test.ts
git commit -m "feat: add activateScene and updateScene to projectStore

- Add activateScene method to activate a specific scene
- Add updateScene method to update scene metadata
- Update tests for new functionality

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 任务 5: 扩展 assetStore

**文件**:
- 修改: `packages/client/src/stores/assetStore.ts`
- 创建/修改: `packages/client/src/stores/assetStore.test.ts`

**步骤 1: 编写新测试**

创建或修改 `packages/client/src/stores/assetStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAssetStore } from './assetStore';
import { api } from '../lib/api';

vi.mock('../lib/api');

describe('assetStore - update operations', () => {
  beforeEach(() => {
    useAssetStore.setState({
      assets: [
        { id: 1, name: 'model.glb', type: 'model', project_id: 1, file_path: '', file_size: 0, created_at: '', updated_at: '' },
        { id: 2, name: 'texture.png', type: 'texture', project_id: 1, file_path: '', file_size: 0, created_at: '', updated_at: '' },
      ],
    });
    vi.clearAllMocks();
  });

  it('should update asset', async () => {
    const mockResponse = { data: { id: 1, name: 'renamed-model.glb' } };
    vi.mocked(api.put).mockResolvedValue(mockResponse);

    await useAssetStore.getState().updateAsset(1, { name: 'renamed-model.glb' });

    expect(api.put).toHaveBeenCalledWith('/assets/1', { name: 'renamed-model.glb' });

    const state = useAssetStore.getState();
    expect(state.assets.find(a => a.id === 1)?.name).toBe('renamed-model.glb');
  });
});
```

**步骤 2: 运行测试验证失败**

```bash
cd .worktrees/context-menu
pnpm --filter client test assetStore
```

预期: 失败（updateAsset 方法不存在）

**步骤 3: 实现 updateAsset 方法**

修改 `packages/client/src/stores/assetStore.ts`:

```typescript
// 在 assetStore 的 actions 部分添加

updateAsset: async (assetId: number, data: Partial<Asset>) => {
  try {
    const response = await api.put(`/assets/${assetId}`, data);
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId ? { ...a, ...response.data } : a
      ),
    }));
  } catch (error) {
    console.error('Failed to update asset:', error);
    throw error;
  }
},
```

**步骤 4: 运行测试验证通过**

```bash
cd .worktrees/context-menu
pnpm --filter client test assetStore
```

预期: 全部通过

**步骤 5: 提交**

```bash
cd .worktrees/context-menu
git add packages/client/src/stores/assetStore.ts packages/client/src/stores/assetStore.test.ts
git commit -m "feat: add updateAsset to assetStore

- Add updateAsset method for renaming assets
- Add tests for asset update functionality

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 任务 6: 扩展 sceneStore 添加资产实例化

**文件**:
- 修改: `packages/client/src/stores/sceneStore.ts`
- 修改: `packages/client/src/stores/sceneStore.test.ts`

**步骤 1: 编写新测试**

修改 `packages/client/src/stores/sceneStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from './sceneStore';
import { useAssetStore } from './assetStore';

describe('sceneStore - add asset to scene', () => {
  beforeEach(() => {
    useSceneStore.setState({
      scene: {
        name: 'Test Scene',
        objects: [],
      },
      isDirty: false,
    });

    useAssetStore.setState({
      assets: [
        {
          id: 1,
          name: 'model.glb',
          type: 'model',
          project_id: 1,
          file_path: '/uploads/model.glb',
          file_size: 1024,
          created_at: '',
          updated_at: ''
        },
      ],
    });
  });

  it('should add model asset to scene center', () => {
    useSceneStore.getState().addAssetToScene(1);

    const state = useSceneStore.getState();
    expect(state.scene.objects).toHaveLength(1);
    expect(state.scene.objects[0].type).toBe('model');
    expect(state.scene.objects[0].position).toEqual({ x: 0, y: 0, z: 0 });
    expect(state.isDirty).toBe(true);
  });

  it('should throw error if asset not found', () => {
    expect(() => {
      useSceneStore.getState().addAssetToScene(999);
    }).toThrow('Asset not found');
  });
});
```

**步骤 2: 运行测试验证失败**

```bash
cd .worktrees/context-menu
pnpm --filter client test sceneStore
```

预期: 失败（addAssetToScene 方法不存在）

**步骤 3: 实现 addAssetToScene 方法**

修改 `packages/client/src/stores/sceneStore.ts`:

```typescript
// 在文件顶部导入
import { useAssetStore } from './assetStore';
import { v4 as uuidv4 } from 'uuid';

// 在 sceneStore 的 actions 部分添加

addAssetToScene: (assetId: number) => {
  const asset = useAssetStore.getState().assets.find((a) => a.id === assetId);
  if (!asset) {
    throw new Error('Asset not found');
  }

  const newObject = {
    id: uuidv4(),
    name: asset.name.replace(/\.[^/.]+$/, ''), // 移除文件扩展名
    type: asset.type === 'model' ? ('model' as const) : ('group' as const),
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    visible: true,
    modelPath: asset.type === 'model' ? asset.file_path : undefined,
    children: [],
  };

  set((state) => ({
    scene: {
      ...state.scene,
      objects: [...state.scene.objects, newObject],
    },
    isDirty: true,
  }));
},
```

**步骤 4: 运行测试验证通过**

```bash
cd .worktrees/context-menu
pnpm --filter client test sceneStore
```

预期: 全部通过

**步骤 5: 提交**

```bash
cd .worktrees/context-menu
git add packages/client/src/stores/sceneStore.ts packages/client/src/stores/sceneStore.test.ts
git commit -m "feat: add addAssetToScene to sceneStore

- Add method to instantiate assets in scene center
- Create scene objects from asset metadata
- Mark scene as dirty after adding asset

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 任务 7: 修改 ProjectPanel 集成所有功能

**文件**:
- 修改: `packages/client/src/components/panels/ProjectPanel.tsx`

**步骤 1: 无需新测试（集成测试）**

ProjectPanel 是一个集成组件，主要通过手动测试验证。

**步骤 2: 修改 ProjectPanel**

修改 `packages/client/src/components/panels/ProjectPanel.tsx`:

```typescript
// 在导入部分添加
import { SceneCard } from './SceneCard';
import { useSceneStore } from '../../stores/sceneStore';

// 在 ProjectPanel 组件内部添加处理函数

// 场景操作
const handleSceneOpen = async (sceneId: number) => {
  if (!currentProject) return;
  try {
    await projectStore.activateScene(currentProject.id, sceneId);
  } catch (error) {
    console.error('Failed to activate scene:', error);
    alert('激活场景失败，请重试');
  }
};

const handleSceneRename = async (sceneId: number, newName: string) => {
  if (!newName.trim()) {
    alert('名称不能为空');
    return;
  }
  if (newName.length > 255) {
    alert('名称过长（最多255字符）');
    return;
  }
  try {
    await projectStore.updateScene(sceneId, { name: newName });
  } catch (error) {
    console.error('Failed to rename scene:', error);
    alert('重命名失败，请重试');
  }
};

const handleSceneDelete = async (sceneId: number) => {
  const scene = scenes.find((s) => s.id === sceneId);
  if (scene?.is_active) {
    alert('无法删除活动场景，请先切换到其他场景');
    return;
  }
  if (!confirm('确定要删除这个场景吗？')) return;

  try {
    await projectStore.deleteScene(sceneId);
  } catch (error) {
    console.error('Failed to delete scene:', error);
    alert('删除场景失败，请重试');
  }
};

// 资产操作
const handleAssetOpen = async (assetId: number) => {
  try {
    useSceneStore.getState().addAssetToScene(assetId);
  } catch (error) {
    console.error('Failed to add asset to scene:', error);
    alert('添加资产到场景失败，请重试');
  }
};

const handleAssetRename = async (assetId: number, newName: string) => {
  if (!newName.trim()) {
    alert('名称不能为空');
    return;
  }
  if (newName.length > 255) {
    alert('名称过长（最多255字符）');
    return;
  }
  if (/[<>:"/\\|?*]/.test(newName)) {
    alert('名称包含非法字符');
    return;
  }
  try {
    await assetStore.updateAsset(assetId, { name: newName });
  } catch (error) {
    console.error('Failed to rename asset:', error);
    alert('重命名失败，请重试');
  }
};

// 在渲染部分，替换场景卡片的硬编码 div 为 SceneCard 组件
// 找到这部分代码（大约在 Line 237-251）:
{scenes.map((scene) => (
  <div
    key={scene.id}
    className="flex flex-col items-center p-2 rounded bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
  >
    {/* ... */}
  </div>
))}

// 替换为:
{scenes.map((scene) => (
  <SceneCard
    key={scene.id}
    scene={scene}
    onOpen={() => handleSceneOpen(scene.id)}
    onRename={(name) => handleSceneRename(scene.id, name)}
    onDelete={() => handleSceneDelete(scene.id)}
  />
))}

// 在渲染部分，修改 AssetCard 的使用（大约在 Line 280-288）:
{assets.map((asset) => (
  <AssetCard
    key={asset.id}
    asset={asset}
    selected={selectedAssetId === asset.id}
    onSelect={() => setSelectedAssetId(asset.id)}
    onOpen={() => handleAssetOpen(asset.id)}
    onRename={(name) => handleAssetRename(asset.id, name)}
    onDelete={() => handleDeleteAsset(asset.id)}
    onDragStart={(e) => handleAssetDragStart(e, asset.id)}
  />
))}
```

**步骤 3: 运行所有测试**

```bash
cd .worktrees/context-menu
pnpm --filter client test
```

预期: 全部通过

**步骤 4: 手动测试**

启动开发服务器并手动测试：

```bash
cd .worktrees/context-menu
pnpm dev
```

测试清单：
- [ ] 场景卡片右键菜单显示
- [ ] 场景"打开"激活场景
- [ ] 场景重命名功能
- [ ] 场景删除功能
- [ ] 活动场景阻止删除
- [ ] 资产卡片右键菜单显示
- [ ] 资产"打开"添加到场景中央
- [ ] 资产重命名功能
- [ ] 资产删除功能
- [ ] 右键菜单边界检测
- [ ] ESC 键关闭菜单
- [ ] 点击外部关闭菜单

**步骤 5: 提交**

```bash
cd .worktrees/context-menu
git add packages/client/src/components/panels/ProjectPanel.tsx
git commit -m "feat: integrate context menu into ProjectPanel

- Use SceneCard component for scenes
- Add handlers for scene open/rename/delete
- Add handlers for asset open/rename/delete
- Validate input and handle errors
- Block deletion of active scene

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 任务 8: 验证后端 API 支持

**文件**:
- 检查: `packages/server/src/routes/scenes.ts`
- 检查: `packages/server/src/routes/assets.ts`

**步骤 1: 检查场景 API**

```bash
cd .worktrees/context-menu
grep -n "PUT.*activate" packages/server/src/routes/scenes.ts
grep -n "PUT.*scenes/:id" packages/server/src/routes/scenes.ts
```

预期: 找到激活和更新场景的路由

**步骤 2: 检查资产 API**

```bash
cd .worktrees/context-menu
grep -n "PUT.*assets/:id" packages/server/src/routes/assets.ts
```

预期: 找到更新资产的路由

**步骤 3: 如果 API 不存在，添加缺失的端点**

如果激活场景 API 不存在，在 `packages/server/src/routes/scenes.ts` 添加:

```typescript
router.put('/:projectId/scenes/:id/activate', requireAuth, async (req, res) => {
  const { projectId, id } = req.params;
  const userId = req.user!.id;

  try {
    // 验证项目所有权
    const project = await Project.findById(parseInt(projectId));
    if (!project || project.owner_id !== userId) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 验证场景属于项目
    const scene = await Scene.findById(parseInt(id));
    if (!scene || scene.project_id !== parseInt(projectId)) {
      return res.status(404).json({ error: 'Scene not found' });
    }

    // 取消当前活动场景
    await Scene.deactivateAll(parseInt(projectId));

    // 激活新场景
    await Scene.activate(parseInt(id));

    const updatedScene = await Scene.findById(parseInt(id));
    res.json(updatedScene);
  } catch (error) {
    console.error('Failed to activate scene:', error);
    res.status(500).json({ error: 'Failed to activate scene' });
  }
});
```

如果更新资产 API 不存在，在 `packages/server/src/routes/assets.ts` 添加:

```typescript
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user!.id;

  try {
    const asset = await Asset.findById(parseInt(id));
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // 验证资产所属项目的所有权
    const project = await Project.findById(asset.project_id);
    if (!project || project.owner_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedAsset = await Asset.update(parseInt(id), { name });
    res.json(updatedAsset);
  } catch (error) {
    console.error('Failed to update asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});
```

**步骤 4: 如果添加了新端点，运行后端测试**

```bash
cd .worktrees/context-menu
pnpm --filter server test
```

**步骤 5: 如果有修改，提交**

```bash
cd .worktrees/context-menu
git add packages/server/src/routes/scenes.ts packages/server/src/routes/assets.ts
git commit -m "feat: add API endpoints for scene/asset operations

- Add PUT /projects/:projectId/scenes/:id/activate
- Add PUT /assets/:id for updating asset metadata
- Add ownership verification

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 任务 9: 最终测试和文档

**步骤 1: 运行完整测试套件**

```bash
cd .worktrees/context-menu
pnpm test
```

预期: 前端所有测试通过

**步骤 2: E2E 测试（可选）**

如果时间允许，可以添加简单的 E2E 测试验证右键菜单功能。

**步骤 3: 更新 CHANGELOG（如果项目有）**

**步骤 4: 最终提交**

```bash
cd .worktrees/context-menu
git add .
git commit -m "docs: update documentation for context menu feature

- Update changelog
- Add usage notes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 完成

所有任务完成后，使用 @superpowers:finishing-a-development-branch 决定如何集成工作（合并、PR 或清理）。

---

## 参考文档

- 设计文档: `docs/plans/2026-02-11-context-menu-design.md`
- 项目架构: `CLAUDE.md`

## 测试策略

- 单元测试：所有新组件和 store 方法
- 集成测试：ProjectPanel 的手动测试
- E2E测试（可选）：完整的用户流程

## 注意事项

1. **YAGNI**: 只实现设计中的功能，不添加额外特性
2. **DRY**: ContextMenu 是可复用组件，避免重复代码
3. **TDD**: 先写测试，再实现功能
4. **频繁提交**: 每个任务完成后立即提交
5. **错误处理**: 所有 API 调用都要有 try-catch
6. **用户体验**: 操作失败时给出清晰的错误提示
