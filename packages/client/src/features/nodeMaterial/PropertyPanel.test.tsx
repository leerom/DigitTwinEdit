// packages/client/src/features/nodeMaterial/PropertyPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PropertyPanel } from './PropertyPanel';
import type { Node } from '@xyflow/react';
import type { NodeRFData } from '@/types';

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({ updateNodeData: vi.fn(), fitView: vi.fn() }),
}));

describe('PropertyPanel', () => {
  it('无选中节点时显示全局操作面板', () => {
    render(<PropertyPanel selectedNodes={[]} />);
    expect(screen.getByText('重置为默认')).toBeInTheDocument();
    expect(screen.getByText('适应视图')).toBeInTheDocument();
    expect(screen.getByText('导出 JSON')).toBeInTheDocument();
    expect(screen.getByText('导入 JSON')).toBeInTheDocument();
  });

  it('选中 FloatInput 节点时显示节点名称', () => {
    const node: Node = {
      id: 'f1',
      type: 'FloatInput',
      position: { x: 0, y: 0 },
      data: { typeKey: 'FloatInput', params: { value: 0.5 } } as Record<string, unknown>,
    };
    render(<PropertyPanel selectedNodes={[node]} />);
    expect(screen.getByText('Float（浮点数）')).toBeInTheDocument();
  });
});
