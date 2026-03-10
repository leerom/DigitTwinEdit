// packages/client/src/features/nodeMaterial/PropertyPanel.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PropertyPanel } from './PropertyPanel';
import type { Node } from '@xyflow/react';
import type { NodeRFData } from '@/types';

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({ updateNodeData: vi.fn() }),
}));

describe('PropertyPanel', () => {
  it('无选中节点时显示占位符', () => {
    render(<PropertyPanel selectedNodes={[]} />);
    expect(screen.getByText('点击节点查看属性')).toBeInTheDocument();
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
