// packages/client/src/features/nodeMaterial/NodeLibraryPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NodeLibraryPanel } from './NodeLibraryPanel';

describe('NodeLibraryPanel', () => {
  it('渲染所有分类标题', () => {
    render(<NodeLibraryPanel onAddNode={vi.fn()} />);
    expect(screen.getByText(/Inputs（输入）/)).toBeInTheDocument();
    expect(screen.getByText(/Math（数学运算）/)).toBeInTheDocument();
    expect(screen.getByText(/Output（输出）/)).toBeInTheDocument();
  });

  it('搜索过滤节点', () => {
    render(<NodeLibraryPanel onAddNode={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('搜索节点...'), {
      target: { value: 'Color' },
    });
    expect(screen.getByTestId('node-item-ColorInput')).toBeInTheDocument();
    expect(screen.queryByTestId('node-item-FloatInput')).not.toBeInTheDocument();
  });

  it('双击节点调用 onAddNode', () => {
    const onAddNode = vi.fn();
    render(<NodeLibraryPanel onAddNode={onAddNode} />);
    fireEvent.dblClick(screen.getByTestId('node-item-ColorInput'));
    expect(onAddNode).toHaveBeenCalledWith('ColorInput');
  });
});
