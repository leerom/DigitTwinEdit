# Phase 4: 画布

> 上级索引：[README.md](./README.md)

---

## Task 6: NodeCanvas 深色主题 + MiniMap + 连接线优化 {#task-6}

**文件:**
- Modify: `packages/client/src/features/nodeMaterial/NodeCanvas.tsx`

**目标:** Controls 深色样式 + MiniMap + Background Dots + 连接线 SmoothStep + 深色 CSS 覆盖

### Step 1: 完整替换文件内容

```tsx
// packages/client/src/features/nodeMaterial/NodeCanvas.tsx
import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NODE_TYPES } from './nodes/nodeTypes';
import { CATEGORY_MAP } from './nodes/nodeCategories';
import type { NodeRFData } from '@/types';

// ReactFlow Controls 深色样式注入（Controls 不支持 className 深度覆盖，需要 CSS）
const CONTROLS_STYLE: React.CSSProperties = {
  background: '#161922',
  border: '1px solid #2d333f',
  borderRadius: '6px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
};

const MINIMAP_STYLE: React.CSSProperties = {
  background: '#1e222d',
  border: '1px solid #2d333f',
  borderRadius: '6px',
};

const EDGE_STYLE: React.CSSProperties = {
  stroke: '#4d5566',
  strokeWidth: 2,
};

const CONNECTION_LINE_STYLE: React.CSSProperties = {
  stroke: '#3b82f6',
  strokeWidth: 2,
};

interface Props {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onAddNode: (typeKey: string, position: { x: number; y: number }) => void;
}

// MiniMap 节点颜色：按 category 品类色
function miniMapNodeColor(node: Node): string {
  const d = node.data as unknown as NodeRFData;
  if (!d?.typeKey) return '#2d333f';
  // 从 NODE_TYPES 找对应 category 颜色
  // 简化：根据已知 category 映射
  const key = d.typeKey;
  if (key === 'MaterialOutput') return '#ef4444';
  if (key.includes('Input') || key === 'TimeNode' || key === 'UVNode') return '#2563eb';
  if (['AddNode','SubNode','MulNode','DivNode','MixNode','DotNode','CrossNode',
       'NormalizeNode','AbsNode','SinNode','PowNode','ClampNode'].includes(key)) return '#7c3aed';
  if (key === 'PositionNode' || key === 'NormalNode' || key === 'NormalMapNode') return '#0891b2';
  return '#374151';
}

const CanvasInner: React.FC<Props> = ({
  nodes, edges, onNodesChange, onEdgesChange, onConnect, onAddNode,
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
      className="flex-1 h-full bg-bg-dark"
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
        connectionLineStyle={CONNECTION_LINE_STYLE}
        defaultEdgeOptions={{ style: EDGE_STYLE, type: 'smoothstep' }}
        connectionLineType="smoothstep"
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#2d333f"
          gap={24}
          size={1.5}
        />
        <Controls style={CONTROLS_STYLE} showInteractive={false} />
        <MiniMap
          style={MINIMAP_STYLE}
          nodeColor={miniMapNodeColor}
          nodeStrokeWidth={0}
          maskColor="rgba(12,14,20,0.7)"
          width={130}
          height={88}
        />
      </ReactFlow>
    </div>
  );
};

export const NodeCanvas: React.FC<Props> = (props) => <CanvasInner {...props} />;
```

### Step 2: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "error TS" | wc -l
```

Expected: 4（无新增，`connectionLineType="smoothstep"` 为合法字符串字面量）

> **注意:** `connectionLineType` 需要从 `@xyflow/react` 导入 `ConnectionLineType` enum，或直接用字符串 `"smoothstep"`。若 TS 报错，改为：
> ```typescript
> import { ..., ConnectionLineType } from '@xyflow/react';
> // 并在 ReactFlow props 里：
> connectionLineType={ConnectionLineType.SmoothStep}
> ```

### Step 3: Commit

```bash
git add packages/client/src/features/nodeMaterial/NodeCanvas.tsx
git commit -m "style(nodeMaterial): dark theme canvas - MiniMap, Dots bg, smoothstep edges, Controls dark style"
```
