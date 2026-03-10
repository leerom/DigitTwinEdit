// packages/client/src/features/nodeMaterial/hooks/useNodeEditor.ts
import { useReducer, useCallback } from 'react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange, Connection, OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react';
import type { NodeRFData, NodeGraphData } from '@/types';
import { NODE_REGISTRY } from '../nodes/nodeRegistry';

// 将 NodeRFData 存储在 Node.data（Record<string, unknown> 兼容）
type RFNode = Node;

type HistoryEntry = { nodes: RFNode[]; edges: Edge[] };

interface EditorState {
  nodes: RFNode[];
  edges: Edge[];
  history: HistoryEntry[];
  future: HistoryEntry[];
}

type Action =
  | { type: 'NODES_CHANGE'; changes: NodeChange[] }
  | { type: 'EDGES_CHANGE'; changes: EdgeChange[] }
  | { type: 'CONNECT'; connection: Connection }
  | { type: 'ADD_NODE'; typeKey: string; position: { x: number; y: number } }
  | { type: 'LOAD_GRAPH'; nodes: RFNode[]; edges: Edge[] }
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
      const data: NodeRFData = { typeKey: action.typeKey, params: { ...def.defaultParams } };
      return {
        ...state,
        nodes: [
          ...state.nodes,
          {
            id,
            type: action.typeKey,
            position: action.position,
            data: data as unknown as Record<string, unknown>,
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

const DEFAULT_NODES: RFNode[] = [
  {
    id: 'output-default',
    type: 'MaterialOutput',
    position: { x: 400, y: 200 },
    data: { typeKey: 'MaterialOutput', params: {} } as unknown as Record<string, unknown>,
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

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => dispatch({ type: 'NODES_CHANGE', changes }),
    [],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => dispatch({ type: 'EDGES_CHANGE', changes }),
    [],
  );
  const handleConnect: OnConnect = useCallback(
    (connection) => dispatch({ type: 'CONNECT', connection }),
    [],
  );
  const addNode = useCallback(
    (typeKey: string, position: { x: number; y: number }) =>
      dispatch({ type: 'ADD_NODE', typeKey, position }),
    [],
  );
  const loadGraph = useCallback(
    (nodes: RFNode[], edges: Edge[]) =>
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
        type: n.type ?? (n.data as unknown as NodeRFData).typeKey,
        position: n.position,
        data: n.data as unknown as NodeRFData,
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
