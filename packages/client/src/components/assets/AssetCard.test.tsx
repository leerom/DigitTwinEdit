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
