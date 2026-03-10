# 节点材质编辑器 — Phase 3: UI 组件

> 上级索引：[README.md](./README.md)

---

## Task 7: 节点 React 组件

**Files:**
- Create: `packages/client/src/features/nodeMaterial/nodes/components/BaseNode.tsx`
- Create: `packages/client/src/features/nodeMaterial/nodes/components/InputNode.tsx`
- Create: `packages/client/src/features/nodeMaterial/nodes/components/GenericNode.tsx`
- Create: `packages/client/src/features/nodeMaterial/nodes/components/OutputNode.tsx`
- Create: `packages/client/src/features/nodeMaterial/nodes/nodeTypes.ts`

### Step 1: 创建 `BaseNode.tsx`

```tsx
// packages/client/src/features/nodeMaterial/nodes/components/BaseNode.tsx
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeTypeDef, NodePortDef } from '@/types';
import { CATEGORY_MAP } from '../nodeCategories';

const PORT_COLORS: Record<string, string> = {
  float: '#4ade80', int: '#86efac', bool: '#fcd34d',
  vec2: '#60a5fa', vec3: '#a78bfa', vec4: '#f472b6',
  color: '#fb923c', texture: '#38bdf8', mat4: '#94a3b8', any: '#9ca3af',
};
const pc = (type: string) => PORT_COLORS[type] ?? '#9ca3af';

interface BaseNodeProps {
  typeDef: NodeTypeDef;
  selected?: boolean;
  children?: React.ReactNode;
}

export const BaseNode: React.FC<BaseNodeProps> = ({ typeDef, selected = false, children }) => {
  const headerBg = CATEGORY_MAP.get(typeDef.category)?.color ?? '#374151';
  return (
    <div
      className={`min-w-[160px] rounded shadow-lg text-[11px] bg-[#1a1d25] border ${
        selected ? 'border-blue-400 border-2' : 'border-[#3a3f4b]'
      }`}
    >
      <div
        className="rounded-t px-3 py-1 font-semibold text-white select-none"
        style={{ background: headerBg }}
      >
        {typeDef.label}
      </div>
      <div className="flex py-1.5">
        {/* Left: input handles */}
        <div className="flex flex-col gap-1.5">
          {typeDef.inputs.map((port: NodePortDef) => (
            <div key={port.id} className="relative flex items-center h-5">
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                className="!w-2.5 !h-2.5 !border-none !rounded-sm"
                style={{ background: pc(port.type) }}
              />
              <span className="ml-3 mr-2 text-slate-400 whitespace-nowrap">{port.label}</span>
            </div>
          ))}
        </div>
        {/* Center: inline editing */}
        {children && (
          <div className="flex-1 flex flex-col gap-1 px-2 min-w-0">{children}</div>
        )}
        {/* Right: output handles */}
        <div className="flex flex-col gap-1.5 ml-auto">
          {typeDef.outputs.map((port: NodePortDef) => (
            <div key={port.id} className="relative flex items-center justify-end h-5">
              <span className="mr-3 ml-2 text-slate-300 whitespace-nowrap">{port.label}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                className="!w-2.5 !h-2.5 !border-none !rounded-sm"
                style={{ background: pc(port.type) }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Step 2: 创建 `GenericNode.tsx`

```tsx
// packages/client/src/features/nodeMaterial/nodes/components/GenericNode.tsx
import React from 'react';
import type { NodeProps } from '@xyflow/react';
import { NODE_REGISTRY } from '../nodeRegistry';
import { BaseNode } from './BaseNode';
import type { NodeRFData } from '@/types';

export const GenericNode: React.FC<NodeProps<NodeRFData>> = ({ data, selected }) => {
  const typeDef = NODE_REGISTRY[data.typeKey];
  if (!typeDef) return null;
  return <BaseNode typeDef={typeDef} selected={selected} />;
};
```

### Step 3: 创建 `InputNode.tsx`

```tsx
// packages/client/src/features/nodeMaterial/nodes/components/InputNode.tsx
import React, { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { NODE_REGISTRY } from '../nodeRegistry';
import { BaseNode } from './BaseNode';
import type { NodeRFData } from '@/types';

export const InputNode: React.FC<NodeProps<NodeRFData>> = ({ id, data, selected }) => {
  const typeDef = NODE_REGISTRY[data.typeKey];
  const { updateNodeData } = useReactFlow();

  const setParam = useCallback(
    (key: string, value: unknown) => {
      updateNodeData(id, { ...data, params: { ...data.params, [key]: value } });
    },
    [id, data, updateNodeData],
  );

  if (!typeDef) return null;

  const renderInline = () => {
    const p = data.params;
    const inputCls =
      'bg-[#0c0e14] border border-[#2d333f] text-white text-[11px] px-1.5 py-0.5 rounded focus:outline-none nodrag';
    switch (data.typeKey) {
      case 'FloatInput':
        return (
          <input
            type="number"
            step="0.01"
            value={p.value as number ?? 0}
            onChange={(e) => setParam('value', parseFloat(e.target.value) || 0)}
            className={`w-full ${inputCls}`}
          />
        );
      case 'ColorInput':
        return (
          <div className="flex items-center gap-1 nodrag">
            <input
              type="color"
              value={p.value as string ?? '#ffffff'}
              onChange={(e) => setParam('value', e.target.value)}
              className="w-6 h-5 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <span className="text-slate-400 text-[10px]">{p.value as string ?? '#ffffff'}</span>
          </div>
        );
      case 'Vec2Input':
        return (
          <div className="flex gap-1 nodrag">
            {(['x', 'y'] as const).map((axis) => (
              <input
                key={axis}
                type="number"
                step="0.01"
                value={p[axis] as number ?? 0}
                onChange={(e) => setParam(axis, parseFloat(e.target.value) || 0)}
                className={`w-12 ${inputCls}`}
                placeholder={axis}
              />
            ))}
          </div>
        );
      case 'Vec3Input':
        return (
          <div className="flex flex-col gap-0.5 nodrag">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <input
                key={axis}
                type="number"
                step="0.01"
                value={p[axis] as number ?? 0}
                onChange={(e) => setParam(axis, parseFloat(e.target.value) || 0)}
                className={`w-full ${inputCls}`}
                placeholder={axis}
              />
            ))}
          </div>
        );
      case 'UVNode':
        return (
          <select
            value={p.index as number ?? 0}
            onChange={(e) => setParam('index', parseInt(e.target.value, 10))}
            className={`${inputCls} nodrag`}
          >
            <option value={0}>UV0</option>
            <option value={1}>UV1</option>
          </select>
        );
      case 'PositionNode':
      case 'NormalNode':
        return (
          <select
            value={p.space as string ?? 'local'}
            onChange={(e) => setParam('space', e.target.value)}
            className={`${inputCls} nodrag`}
          >
            <option value="local">Local</option>
            <option value="world">World</option>
            <option value="view">View</option>
          </select>
        );
      case 'TextureInput':
        return (
          <div className="text-slate-400 text-[10px] px-1 nodrag">
            {p.assetId ? `#${p.assetId}` : '未选择纹理'}
          </div>
        );
      default:
        return null;
    }
  };

  return <BaseNode typeDef={typeDef} selected={selected}>{renderInline()}</BaseNode>;
};
```

### Step 4: 创建 `OutputNode.tsx`

```tsx
// packages/client/src/features/nodeMaterial/nodes/components/OutputNode.tsx
import React from 'react';
import type { NodeProps } from '@xyflow/react';
import { NODE_REGISTRY } from '../nodeRegistry';
import { BaseNode } from './BaseNode';
import type { NodeRFData } from '@/types';

export const OutputNode: React.FC<NodeProps<NodeRFData>> = ({ data, selected }) => {
  const typeDef = NODE_REGISTRY[data.typeKey];
  if (!typeDef) return null;
  return <BaseNode typeDef={typeDef} selected={selected} />;
};
```

### Step 5: 创建 `nodeTypes.ts`

```typescript
// packages/client/src/features/nodeMaterial/nodes/nodeTypes.ts
import type { NodeTypes } from '@xyflow/react';
import { InputNode } from './components/InputNode';
import { GenericNode } from './components/GenericNode';
import { OutputNode } from './components/OutputNode';

export const NODE_TYPES: NodeTypes = {
  // Input（含内联编辑）
  FloatInput: InputNode,
  ColorInput: InputNode,
  Vec2Input: InputNode,
  Vec3Input: InputNode,
  TextureInput: InputNode,
  TimeNode: GenericNode,
  UVNode: InputNode,
  // Math
  AddNode: GenericNode,
  SubNode: GenericNode,
  MulNode: GenericNode,
  DivNode: GenericNode,
  MixNode: GenericNode,
  DotNode: GenericNode,
  CrossNode: GenericNode,
  NormalizeNode: GenericNode,
  AbsNode: GenericNode,
  SinNode: GenericNode,
  PowNode: GenericNode,
  ClampNode: GenericNode,
  // Mesh
  PositionNode: InputNode,
  NormalNode: InputNode,
  // PBR
  NormalMapNode: GenericNode,
  // Output
  MaterialOutput: OutputNode,
};
```

### Step 6: 验证类型检查无新增错误

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "error TS" | wc -l
```

Expected: 行数不超过修改前

### Step 7: Commit

```bash
git add packages/client/src/features/nodeMaterial/nodes/
git commit -m "feat(nodeMaterial): add node React components (BaseNode/InputNode/GenericNode/OutputNode)"
```

---

## Task 8: NodeLibraryPanel.tsx

**Files:**
- Create: `packages/client/src/features/nodeMaterial/NodeLibraryPanel.tsx`
- Create: `packages/client/src/features/nodeMaterial/NodeLibraryPanel.test.tsx`

### Step 1: 先写测试

```tsx
// packages/client/src/features/nodeMaterial/NodeLibraryPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NodeLibraryPanel } from './NodeLibraryPanel';

describe('NodeLibraryPanel', () => {
  it('渲染所有分类标题', () => {
    render(<NodeLibraryPanel onAddNode={vi.fn()} />);
    expect(screen.getByText(/Inputs/)).toBeInTheDocument();
    expect(screen.getByText(/Math/)).toBeInTheDocument();
    expect(screen.getByText(/Output/)).toBeInTheDocument();
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
```

### Step 2: 运行测试，确认失败

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/NodeLibraryPanel.test.tsx 2>&1 | tail -10
```

Expected: FAIL（模块未找到）

### Step 3: 实现 `NodeLibraryPanel.tsx`

```tsx
// packages/client/src/features/nodeMaterial/NodeLibraryPanel.tsx
import React, { useState, useMemo } from 'react';
import { NODE_REGISTRY } from './nodes/nodeRegistry';
import { NODE_CATEGORIES } from './nodes/nodeCategories';
import type { NodeTypeDef } from '@/types';

interface Props {
  onAddNode: (typeKey: string) => void;
}

export const NodeLibraryPanel: React.FC<Props> = ({ onAddNode }) => {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return Object.values(NODE_REGISTRY).filter(
      (n: NodeTypeDef) =>
        !q || n.label.toLowerCase().includes(q) || n.key.toLowerCase().includes(q),
    );
  }, [search]);

  const byCategory = useMemo(() => {
    const map = new Map<string, NodeTypeDef[]>();
    for (const cat of NODE_CATEGORIES) map.set(cat.key, []);
    for (const node of filtered) {
      map.get(node.category)?.push(node);
    }
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full bg-[#0c0e14] border-r border-[#2d333f] text-xs w-48 shrink-0">
      <div className="p-2 border-b border-[#2d333f]">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">
            search
          </span>
          <input
            className="w-full bg-[#1a1d25] border border-[#2d333f] text-white pl-7 pr-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-xs"
            placeholder="搜索节点..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {NODE_CATEGORIES.map((cat) => {
          const nodes = byCategory.get(cat.key) ?? [];
          if (!nodes.length) return null;
          const isCollapsed = !!collapsed[cat.key];
          return (
            <div key={cat.key}>
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 border-b border-[#2d333f]/50"
                onClick={() =>
                  setCollapsed((p) => ({ ...p, [cat.key]: !p[cat.key] }))
                }
              >
                <span
                  className="material-symbols-outlined text-sm select-none"
                  style={{ color: cat.color }}
                >
                  {cat.icon}
                </span>
                <span className="text-slate-300 flex-1 text-[11px]">{cat.label}</span>
                <span className="material-symbols-outlined text-sm text-slate-500 select-none">
                  {isCollapsed ? 'chevron_right' : 'expand_more'}
                </span>
              </button>
              {!isCollapsed &&
                nodes.map((node) => (
                  <button
                    key={node.key}
                    data-testid={`node-item-${node.key}`}
                    className="w-full text-left px-4 py-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-[11px]"
                    onDoubleClick={() => onAddNode(node.key)}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('nodeType', node.key)}
                  >
                    {node.label}
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

### Step 4: 运行测试，确认通过

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/NodeLibraryPanel.test.tsx 2>&1 | tail -10
```

Expected: 3 tests PASS

### Step 5: Commit

```bash
git add packages/client/src/features/nodeMaterial/NodeLibraryPanel.tsx \
        packages/client/src/features/nodeMaterial/NodeLibraryPanel.test.tsx
git commit -m "feat(nodeMaterial): add NodeLibraryPanel with search and category filter"
```

---

## Task 9: useNodeEditor.ts + NodeCanvas.tsx

**Files:**
- Create: `packages/client/src/features/nodeMaterial/hooks/useNodeEditor.ts`
- Create: `packages/client/src/features/nodeMaterial/hooks/useNodeEditor.test.ts`
- Create: `packages/client/src/features/nodeMaterial/NodeCanvas.tsx`

### Step 1: 先写 useNodeEditor 测试

```typescript
// packages/client/src/features/nodeMaterial/hooks/useNodeEditor.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useNodeEditor } from './useNodeEditor';

describe('useNodeEditor', () => {
  it('初始化时含一个 MaterialOutput 节点', () => {
    const { result } = renderHook(() => useNodeEditor());
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.nodes[0].type).toBe('MaterialOutput');
  });

  it('addNode 添加新节点', () => {
    const { result } = renderHook(() => useNodeEditor());
    act(() => { result.current.addNode('FloatInput', { x: 100, y: 100 }); });
    expect(result.current.nodes).toHaveLength(2);
    expect(result.current.nodes[1].type).toBe('FloatInput');
  });

  it('undo/redo addNode 正常工作', () => {
    const { result } = renderHook(() => useNodeEditor());
    act(() => { result.current.addNode('FloatInput', { x: 100, y: 100 }); });
    expect(result.current.nodes).toHaveLength(2);
    act(() => { result.current.undo(); });
    expect(result.current.nodes).toHaveLength(1);
    act(() => { result.current.redo(); });
    expect(result.current.nodes).toHaveLength(2);
  });

  it('toGraphData 返回合法的 NodeGraphData', () => {
    const { result } = renderHook(() => useNodeEditor());
    const graph = result.current.toGraphData();
    expect(graph.version).toBe(1);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });

  it('canUndo 初始为 false，addNode 后为 true', () => {
    const { result } = renderHook(() => useNodeEditor());
    expect(result.current.canUndo).toBe(false);
    act(() => { result.current.addNode('FloatInput', { x: 0, y: 0 }); });
    expect(result.current.canUndo).toBe(true);
  });
});
```

### Step 2: 运行测试，确认失败

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/hooks/useNodeEditor.test.ts 2>&1 | tail -10
```

Expected: FAIL

### Step 3: 实现 `useNodeEditor.ts`

```typescript
// packages/client/src/features/nodeMaterial/hooks/useNodeEditor.ts
import { useReducer, useCallback } from 'react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import type { NodeRFData, NodeGraphData } from '@/types';
import { NODE_REGISTRY } from '../nodes/nodeRegistry';

type HistoryEntry = { nodes: Node<NodeRFData>[]; edges: Edge[] };

interface EditorState {
  nodes: Node<NodeRFData>[];
  edges: Edge[];
  history: HistoryEntry[];
  future: HistoryEntry[];
}

type Action =
  | { type: 'NODES_CHANGE'; changes: NodeChange<Node<NodeRFData>>[] }
  | { type: 'EDGES_CHANGE'; changes: EdgeChange[] }
  | { type: 'CONNECT'; connection: Connection }
  | { type: 'ADD_NODE'; typeKey: string; position: { x: number; y: number } }
  | { type: 'LOAD_GRAPH'; nodes: Node<NodeRFData>[]; edges: Edge[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'NODES_CHANGE':
      return { ...state, nodes: applyNodeChanges(action.changes, state.nodes) };
    case 'EDGES_CHANGE':
      return { ...state, edges: applyEdgeChanges(action.changes, state.edges) };
    case 'CONNECT':
      return {
        ...state,
        edges: addEdge(action.connection, state.edges),
        history: [...state.history.slice(-49), { nodes: state.nodes, edges: state.edges }],
        future: [],
      };
    case 'ADD_NODE': {
      const def = NODE_REGISTRY[action.typeKey];
      if (!def) return state;
      const id = `${action.typeKey}-${Date.now()}`;
      return {
        ...state,
        nodes: [
          ...state.nodes,
          {
            id,
            type: action.typeKey,
            position: action.position,
            data: { typeKey: action.typeKey, params: { ...def.defaultParams } },
            deletable: def.undeletable ? false : undefined,
          },
        ],
        history: [...state.history.slice(-49), { nodes: state.nodes, edges: state.edges }],
        future: [],
      };
    }
    case 'LOAD_GRAPH':
      return { nodes: action.nodes, edges: action.edges, history: [], future: [] };
    case 'UNDO': {
      if (!state.history.length) return state;
      const prev = state.history[state.history.length - 1];
      return {
        ...prev,
        history: state.history.slice(0, -1),
        future: [{ nodes: state.nodes, edges: state.edges }, ...state.future],
      };
    }
    case 'REDO': {
      if (!state.future.length) return state;
      const next = state.future[0];
      return {
        ...next,
        history: [...state.history, { nodes: state.nodes, edges: state.edges }],
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

const DEFAULT_NODES: Node<NodeRFData>[] = [
  {
    id: 'output-default',
    type: 'MaterialOutput',
    position: { x: 400, y: 200 },
    data: { typeKey: 'MaterialOutput', params: {} },
    deletable: false,
  },
];

export function useNodeEditor() {
  const [state, dispatch] = useReducer(reducer, {
    nodes: DEFAULT_NODES,
    edges: [],
    history: [],
    future: [],
  });

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<NodeRFData>>[]) => dispatch({ type: 'NODES_CHANGE', changes }),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => dispatch({ type: 'EDGES_CHANGE', changes }),
    [],
  );
  const handleConnect = useCallback(
    (connection: Connection) => dispatch({ type: 'CONNECT', connection }),
    [],
  );
  const addNode = useCallback(
    (typeKey: string, position: { x: number; y: number }) =>
      dispatch({ type: 'ADD_NODE', typeKey, position }),
    [],
  );
  const loadGraph = useCallback(
    (nodes: Node<NodeRFData>[], edges: Edge[]) =>
      dispatch({ type: 'LOAD_GRAPH', nodes, edges }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const toGraphData = useCallback(
    (): NodeGraphData => ({
      version: 1,
      nodes: state.nodes.map((n) => ({
        id: n.id,
        type: n.type ?? (n.data as NodeRFData).typeKey,
        position: n.position,
        data: n.data as NodeRFData,
      })),
      edges: state.edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? '',
        target: e.target,
        targetHandle: e.targetHandle ?? '',
      })),
    }),
    [state.nodes, state.edges],
  );

  return {
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange,
    onEdgesChange,
    handleConnect,
    addNode,
    loadGraph,
    undo,
    redo,
    canUndo: state.history.length > 0,
    canRedo: state.future.length > 0,
    toGraphData,
  };
}
```

### Step 4: 运行测试，确认通过

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/hooks/useNodeEditor.test.ts 2>&1 | tail -10
```

Expected: 5 tests PASS

### Step 5: 创建 `NodeCanvas.tsx`

```tsx
// packages/client/src/features/nodeMaterial/NodeCanvas.tsx
import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useReactFlow,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NODE_TYPES } from './nodes/nodeTypes';
import type { NodeRFData } from '@/types';

interface Props {
  nodes: Node<NodeRFData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<NodeRFData>>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onAddNode: (typeKey: string, position: { x: number; y: number }) => void;
}

// 内部组件（在 ReactFlow 上下文内，可使用 useReactFlow）
const CanvasInner: React.FC<Props> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onAddNode,
}) => {
  const { screenToFlowPosition } = useReactFlow();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const typeKey = e.dataTransfer.getData('nodeType');
      if (!typeKey) return;
      const bounds = e.currentTarget.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
      onAddNode(typeKey, position);
    },
    [screenToFlowPosition, onAddNode],
  );

  return (
    <div
      className="flex-1 h-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#2d333f" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export const NodeCanvas: React.FC<Props> = (props) => <CanvasInner {...props} />;
```

### Step 6: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "error TS" | wc -l
```

Expected: 行数不超过修改前

### Step 7: Commit

```bash
git add packages/client/src/features/nodeMaterial/hooks/ \
        packages/client/src/features/nodeMaterial/NodeCanvas.tsx
git commit -m "feat(nodeMaterial): add useNodeEditor hook with undo/redo + NodeCanvas"
```

---

## Task 10: PropertyPanel.tsx

**Files:**
- Create: `packages/client/src/features/nodeMaterial/PropertyPanel.tsx`
- Create: `packages/client/src/features/nodeMaterial/PropertyPanel.test.tsx`

### Step 1: 先写测试

```tsx
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
    expect(screen.getByText('未选中节点')).toBeInTheDocument();
  });

  it('选中 FloatInput 节点时显示节点名称', () => {
    const node: Node<NodeRFData> = {
      id: 'f1',
      type: 'FloatInput',
      position: { x: 0, y: 0 },
      data: { typeKey: 'FloatInput', params: { value: 0.5 } },
    };
    render(<PropertyPanel selectedNodes={[node]} />);
    expect(screen.getByText('Float（浮点数）')).toBeInTheDocument();
  });
});
```

### Step 2: 运行测试，确认失败

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/PropertyPanel.test.tsx 2>&1 | tail -10
```

Expected: FAIL

### Step 3: 实现 `PropertyPanel.tsx`

```tsx
// packages/client/src/features/nodeMaterial/PropertyPanel.tsx
import React from 'react';
import type { Node } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { NODE_REGISTRY } from './nodes/nodeRegistry';
import type { NodeRFData } from '@/types';

interface Props {
  selectedNodes: Node<NodeRFData>[];
}

export const PropertyPanel: React.FC<Props> = ({ selectedNodes }) => {
  const { updateNodeData } = useReactFlow();

  if (!selectedNodes.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-500 bg-[#0c0e14]">
        未选中节点
      </div>
    );
  }

  const node = selectedNodes[0];
  const typeDef = NODE_REGISTRY[node.data.typeKey];
  if (!typeDef) return null;

  const setParam = (key: string, value: unknown) => {
    updateNodeData(node.id, {
      ...node.data,
      params: { ...node.data.params, [key]: value },
    });
  };

  const inputCls =
    'bg-[#1a1d25] border border-[#2d333f] text-white text-xs px-2 py-1 rounded focus:outline-none w-full';

  return (
    <div className="flex-1 overflow-y-auto bg-[#0c0e14] p-3 space-y-3 text-xs">
      <div className="text-slate-300 font-medium border-b border-[#2d333f] pb-2">
        {typeDef.label}
      </div>
      {Object.entries(node.data.params).map(([key, value]) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-slate-400">{key}</label>
          {typeof value === 'number' ? (
            <input
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => setParam(key, parseFloat(e.target.value) || 0)}
              className={inputCls}
            />
          ) : typeof value === 'string' && value.startsWith('#') ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onChange={(e) => setParam(key, e.target.value)}
                className="w-8 h-6 rounded border-0 bg-transparent cursor-pointer p-0"
              />
              <span className="text-slate-300">{value}</span>
            </div>
          ) : typeof value === 'string' && key === 'space' ? (
            <select
              value={value}
              onChange={(e) => setParam(key, e.target.value)}
              className={inputCls}
            >
              <option value="local">Local</option>
              <option value="world">World</option>
              <option value="view">View</option>
            </select>
          ) : null}
        </div>
      ))}
    </div>
  );
};
```

### Step 4: 运行测试，确认通过

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/PropertyPanel.test.tsx 2>&1 | tail -10
```

Expected: 2 tests PASS

### Step 5: Commit

```bash
git add packages/client/src/features/nodeMaterial/PropertyPanel.tsx \
        packages/client/src/features/nodeMaterial/PropertyPanel.test.tsx
git commit -m "feat(nodeMaterial): add PropertyPanel for selected node param editing"
```

---

## Task 11: usePreviewMaterial.ts + PreviewPanel.tsx

**Files:**
- Create: `packages/client/src/features/nodeMaterial/hooks/usePreviewMaterial.ts`
- Create: `packages/client/src/features/nodeMaterial/PreviewPanel.tsx`

### Step 1: 创建 `usePreviewMaterial.ts`

```typescript
// packages/client/src/features/nodeMaterial/hooks/usePreviewMaterial.ts
import { useEffect, useRef, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NodeRFData, NodeGraphData } from '@/types';

// 使用 any 避免在模块顶层加载 Three.js（测试环境友好）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMaterial = any;

export function usePreviewMaterial(nodes: Node<NodeRFData>[], edges: Edge[]) {
  const [material, setMaterial] = useState<AnyMaterial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const { compileNodeGraph } = await import('../compiler/tslCompiler');
        const graphData: NodeGraphData = {
          version: 1,
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type ?? (n.data as NodeRFData).typeKey,
            position: n.position,
            data: n.data as NodeRFData,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            sourceHandle: e.sourceHandle ?? '',
            target: e.target,
            targetHandle: e.targetHandle ?? '',
          })),
        };
        const mat = compileNodeGraph(graphData);
        setMaterial(mat);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '编译失败');
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges]);

  return { material, error };
}
```

### Step 2: 创建 `PreviewPanel.tsx`

```tsx
// packages/client/src/features/nodeMaterial/PreviewPanel.tsx
import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PreviewMesh: React.FC<{ material: any | null }> = ({ material }) => {
  const ref = useRef<THREE.Mesh>(null);
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      {material ? (
        <primitive object={material} attach="material" />
      ) : (
        <meshStandardMaterial color="#888888" roughness={0.5} metalness={0.1} />
      )}
    </mesh>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { material: any | null; error: string | null }

export const PreviewPanel: React.FC<Props> = ({ material, error }) => (
  <div className="h-48 bg-black border-t border-[#2d333f] relative shrink-0">
    <Canvas camera={{ position: [0, 0, 3] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 2]} intensity={1} />
      <PreviewMesh material={material} />
      <OrbitControls enableZoom={false} />
    </Canvas>
    {error && (
      <div className="absolute bottom-1 left-1 right-1 text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded truncate">
        {error}
      </div>
    )}
  </div>
);
```

### Step 3: Commit

```bash
git add packages/client/src/features/nodeMaterial/hooks/usePreviewMaterial.ts \
        packages/client/src/features/nodeMaterial/PreviewPanel.tsx
git commit -m "feat(nodeMaterial): add usePreviewMaterial hook and 3D PreviewPanel"
```

---

## Task 12: NodeMaterialEditor.tsx

**Files:**
- Create: `packages/client/src/features/nodeMaterial/NodeMaterialEditor.tsx`
- Create: `packages/client/src/features/nodeMaterial/NodeMaterialEditor.test.tsx`

### Step 1: 先写测试

```tsx
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
  applyNodeChanges: (changes: any[], nodes: any[]) => nodes,
  applyEdgeChanges: (changes: any[], edges: any[]) => edges,
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
```

### Step 2: 运行测试，确认失败

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/NodeMaterialEditor.test.tsx 2>&1 | tail -15
```

Expected: FAIL（组件未实现）

### Step 3: 实现 `NodeMaterialEditor.tsx`

```tsx
// packages/client/src/features/nodeMaterial/NodeMaterialEditor.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { useMaterialStore } from '@/stores/materialStore';
import { useSceneStore } from '@/stores/sceneStore';
import { materialsApi } from '@/api/assets';
import type { NodeRFData, NodeGraphData } from '@/types';
import { NODE_REGISTRY } from './nodes/nodeRegistry';
import { useNodeEditor } from './hooks/useNodeEditor';
import { usePreviewMaterial } from './hooks/usePreviewMaterial';
import { NodeLibraryPanel } from './NodeLibraryPanel';
import { NodeCanvas } from './NodeCanvas';
import { PropertyPanel } from './PropertyPanel';
import { PreviewPanel } from './PreviewPanel';

// 将 NodeGraphData 转为 React Flow nodes/edges
function graphToFlow(graph: NodeGraphData): {
  nodes: Node<NodeRFData>[];
  edges: Edge[];
} {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
      deletable: NODE_REGISTRY[n.type]?.undeletable ? false : undefined,
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
      targetHandle: e.targetHandle,
    })),
  };
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const NodeMaterialEditor: React.FC = () => {
  const nodeEditorMaterialId = useMaterialStore((s) => s.nodeEditorMaterialId);
  const closeNodeEditor = useMaterialStore((s) => s.closeNodeEditor);
  const syncMaterialAsset = useSceneStore((s) => s.syncMaterialAsset);

  const [materialName, setMaterialName] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    handleConnect,
    addNode,
    loadGraph,
    undo,
    redo,
    canUndo,
    canRedo,
    toGraphData,
  } = useNodeEditor();

  const { material, error: compileError } = usePreviewMaterial(nodes, edges);

  // 加载材质
  useEffect(() => {
    if (!nodeEditorMaterialId) return;
    materialsApi.getMaterial(nodeEditorMaterialId).then((data) => {
      setMaterialName(data.name);
      const graph = data.properties?.graph as NodeGraphData | undefined;
      if (graph?.nodes?.length) {
        const { nodes: rfNodes, edges: rfEdges } = graphToFlow(graph);
        loadGraph(rfNodes, rfEdges);
      }
    });
  }, [nodeEditorMaterialId, loadGraph]);

  const handleSave = useCallback(async () => {
    if (!nodeEditorMaterialId) return;
    setSaveStatus('saving');
    const graph = toGraphData();
    const spec = { type: 'NodeMaterial' as const, props: { graph } };
    try {
      await materialsApi.updateMaterial(nodeEditorMaterialId, {
        type: 'NodeMaterial',
        properties: { graph },
      } as any);
      (syncMaterialAsset as any)(nodeEditorMaterialId, spec);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [nodeEditorMaterialId, toGraphData, syncMaterialAsset]);

  // 自动保存（debounce 1s）
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(handleSave, 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  // 全局键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z') { e.preventDefault(); undo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault(); redo();
      }
      if (ctrl && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, handleSave]);

  const selectedNodes = nodes.filter((n) => (n as any).selected);

  const statusText = compileError
    ? `编译错误: ${compileError}`
    : saveStatus === 'saving'
      ? '保存中...'
      : saveStatus === 'saved'
        ? '✓ 已保存'
        : saveStatus === 'error'
          ? '保存失败'
          : '就绪';

  return (
    <ReactFlowProvider>
      <div className="fixed inset-0 z-50 flex flex-col bg-[#0c0e14] text-white">
        {/* 顶栏 */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#2d333f] shrink-0">
          <button
            aria-label="返回"
            onClick={closeNodeEditor}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>返回</span>
          </button>
          <span className="text-slate-500">|</span>
          <span className="text-sm font-medium">{materialName || '节点材质编辑器'}</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              disabled={!canUndo}
              onClick={undo}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <span className="material-symbols-outlined text-base">undo</span>
            </button>
            <button
              disabled={!canRedo}
              onClick={redo}
              className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              title="重做 (Ctrl+Y)"
            >
              <span className="material-symbols-outlined text-base">redo</span>
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-accent-blue hover:bg-accent-blue/90 text-white text-xs rounded transition-colors"
            >
              保存
            </button>
          </div>
        </div>

        {/* 主体 */}
        <div className="flex flex-1 min-h-0">
          <NodeLibraryPanel
            onAddNode={(typeKey) => addNode(typeKey, { x: 200, y: 200 })}
          />
          <NodeCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onAddNode={addNode}
          />
          {/* 右侧面板 */}
          <div className="flex flex-col w-56 shrink-0 border-l border-[#2d333f]">
            <PropertyPanel selectedNodes={selectedNodes} />
            <PreviewPanel material={material} error={compileError} />
          </div>
        </div>

        {/* 状态栏 */}
        <div
          className={`px-4 py-1 text-[11px] border-t border-[#2d333f] shrink-0 ${
            compileError
              ? 'text-red-400'
              : saveStatus === 'saved'
                ? 'text-green-400'
                : 'text-slate-500'
          }`}
        >
          {statusText}
        </div>
      </div>
    </ReactFlowProvider>
  );
};
```

### Step 4: 运行测试，确认通过

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/NodeMaterialEditor.test.tsx 2>&1 | tail -15
```

Expected: 2 tests PASS

### Step 5: Commit

```bash
git add packages/client/src/features/nodeMaterial/NodeMaterialEditor.tsx \
        packages/client/src/features/nodeMaterial/NodeMaterialEditor.test.tsx
git commit -m "feat(nodeMaterial): add NodeMaterialEditor full-screen overlay"
```
