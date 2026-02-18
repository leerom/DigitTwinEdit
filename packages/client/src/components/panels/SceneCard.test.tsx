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

  it('右键菜单包含"新建"选项', () => {
    const handleNew = vi.fn();
    render(<SceneCard scene={mockScene} onNew={handleNew} />);

    // 触发右键菜单
    const card = screen.getByText(mockScene.name).closest('div')!;
    fireEvent.contextMenu(card);

    expect(screen.getByText('新建')).toBeInTheDocument();
  });

  it('点击"新建"菜单项触发 onNew 回调', () => {
    const handleNew = vi.fn();
    render(<SceneCard scene={mockScene} onNew={handleNew} />);

    const card = screen.getByText(mockScene.name).closest('div')!;
    fireEvent.contextMenu(card);
    fireEvent.click(screen.getByText('新建'));

    expect(handleNew).toHaveBeenCalledTimes(1);
  });
});
