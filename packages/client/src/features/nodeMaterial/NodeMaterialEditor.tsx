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
