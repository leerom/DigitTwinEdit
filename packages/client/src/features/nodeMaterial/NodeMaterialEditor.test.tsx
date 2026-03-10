// packages/client/src/features/nodeMaterial/NodeMaterialEditor.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeMaterialEditor } from './NodeMaterialEditor';

// Mock stores
vi.mock('@/stores/materialStore', () => ({
  useMaterialStore: vi.fn((selector: (s: any) => any) =>
    selector({
      nodeEditorMaterialId: 1,
      closeNodeEditor: vi.fn(),
    }),
  ),
}));

vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: vi.fn((selector: (s: any) => any) =>
    selector({ syncMaterialAsset: vi.fn() }),
  ),
}));

vi.mock('@/api/assets', () => ({
  materialsApi: {
    getMaterial: vi.fn().mockResolvedValue({
      id: 1,
      name: '测试节点材质',
      type: 'NodeMaterial',
      properties: {},
    }),
    updateMaterial: vi.fn().mockResolvedValue({}),
  },
}));

// Mock @xyflow/react（防止 canvas 渲染报错）
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: any) => <div data-testid="reactflow">{children}</div>,
  Background: () => null,
  Controls: () => null,
  ReactFlowProvider: ({ children }: any) => <>{children}</>,
  useReactFlow: () => ({
    screenToFlowPosition: vi.fn(() => ({ x: 0, y: 0 })),
    fitView: vi.fn(),
    updateNodeData: vi.fn(),
  }),
  applyNodeChanges: (_changes: any[], nodes: any[]) => nodes,
  applyEdgeChanges: (_changes: any[], edges: any[]) => edges,
  addEdge: vi.fn((conn: any, edges: any[]) => edges),
}));

// Mock @react-three/fiber + drei（防止 WebGL 报错）
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: any) => <div data-testid="canvas">{children}</div>,
}));
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
}));

describe('NodeMaterialEditor', () => {
  it('加载后显示材质名称', async () => {
    render(<NodeMaterialEditor />);
    await waitFor(() =>
      expect(screen.getByText('测试节点材质')).toBeInTheDocument(),
    );
  });

  it('点击返回按钮调用 closeNodeEditor', async () => {
    const { useMaterialStore } = await import('@/stores/materialStore');
    const closeNodeEditor = vi.fn();
    (useMaterialStore as any).mockImplementation((sel: any) =>
      sel({ nodeEditorMaterialId: 1, closeNodeEditor }),
    );
    render(<NodeMaterialEditor />);
    await waitFor(() => screen.getByText('测试节点材质'));
    fireEvent.click(screen.getByRole('button', { name: /返回/ }));
    expect(closeNodeEditor).toHaveBeenCalled();
  });
});
