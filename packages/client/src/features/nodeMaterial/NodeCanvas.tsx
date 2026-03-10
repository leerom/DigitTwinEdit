// packages/client/src/features/nodeMaterial/NodeCanvas.tsx
import React, { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
  ConnectionLineType,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NODE_TYPES } from './nodes/nodeTypes';
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
  onRegisterFitView?: (fn: () => void) => void;
}

// MiniMap 节点颜色：按 category 品类色
function miniMapNodeColor(node: Node): string {
  const d = node.data as unknown as NodeRFData;
  if (!d?.typeKey) return '#2d333f';
  const key = d.typeKey;
  if (key === 'MaterialOutput') return '#ef4444';
  if (key.includes('Input') || key === 'TimeNode' || key === 'UVNode') return '#2563eb';
  if (['AddNode','SubNode','MulNode','DivNode','MixNode','DotNode','CrossNode',
       'NormalizeNode','AbsNode','SinNode','PowNode','ClampNode'].includes(key)) return '#7c3aed';
  if (key === 'PositionNode' || key === 'NormalNode' || key === 'NormalMapNode') return '#0891b2';
  return '#374151';
}

const CanvasInner: React.FC<Props> = ({
  nodes, edges, onNodesChange, onEdgesChange, onConnect, onAddNode, onRegisterFitView,
}) => {
  const { screenToFlowPosition, fitView } = useReactFlow();

  // 注册 fitView 函数供父组件调用
  useEffect(() => {
    onRegisterFitView?.(fitView);
  }, [fitView, onRegisterFitView]);

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
        connectionLineType={ConnectionLineType.SmoothStep}
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
          maskColor="rgba(12,14,20,0.7)"
        />
      </ReactFlow>
    </div>
  );
};

export const NodeCanvas: React.FC<Props> = (props) => <CanvasInner {...props} />;
