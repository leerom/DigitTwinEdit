// packages/client/src/features/nodeMaterial/NodeCanvas.tsx
import React, { useCallback } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NODE_TYPES } from './nodes/nodeTypes';

interface Props {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
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
