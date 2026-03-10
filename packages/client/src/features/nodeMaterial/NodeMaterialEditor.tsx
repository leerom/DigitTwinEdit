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
  const fitViewFnRef = useRef<(() => void) | null>(null);

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
    resetToDefault,
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

  // 导出 JSON
  const handleExportJSON = useCallback(() => {
    const graph = toGraphData();
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${materialName || 'node-material'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [toGraphData, materialName]);

  // 导入 JSON
  const handleImportJSON = useCallback((jsonStr: string) => {
    try {
      const graph = JSON.parse(jsonStr);
      if (!graph?.nodes || !graph?.edges) return;
      const { nodes: rfNodes, edges: rfEdges } = graphToFlow(graph);
      loadGraph(rfNodes, rfEdges);
    } catch {
      // ignore parse errors
    }
  }, [loadGraph]);

  // 全局键盘快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z') { e.preventDefault(); undo(); }
      if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault(); redo();
      }
      if (ctrl && e.key === 's') { e.preventDefault(); handleSave(); }
      // F: 适应视图
      if (!ctrl && (e.key === 'f' || e.key === 'F')) {
        fitViewFnRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, handleSave]);

  const selectedNodes = nodes.filter((n) => (n as any).selected);

  return (
    <ReactFlowProvider>
      <div className="fixed inset-0 z-50 flex flex-col bg-bg-dark text-white font-display">
        {/* 顶栏 */}
        <div className="flex items-center gap-2 px-3 h-10 border-b border-border-dark bg-header-dark shrink-0">
          {/* 返回按钮 */}
          <button
            aria-label="返回"
            onClick={closeNodeEditor}
            className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-white hover:bg-white/5 px-2 py-1 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>返回</span>
          </button>

          {/* 分隔线 */}
          <div className="w-px h-4 bg-border-dark mx-1" />

          {/* 面包屑 */}
          <span className="material-symbols-outlined text-[16px] text-slate-500">device_hub</span>
          <span className="text-[11px] text-slate-500">节点材质</span>
          <span className="text-[11px] text-slate-600">/</span>
          <span className="text-[12px] text-slate-300 font-medium truncate max-w-[200px]">
            {materialName || '加载中...'}
          </span>

          {/* 右侧工具 */}
          <div className="ml-auto flex items-center gap-1">
            <button
              disabled={!canUndo}
              onClick={undo}
              className="flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <span className="material-symbols-outlined text-[16px]">undo</span>
            </button>
            <button
              disabled={!canRedo}
              onClick={redo}
              className="flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"
              title="重做 (Ctrl+Y)"
            >
              <span className="material-symbols-outlined text-[16px]">redo</span>
            </button>

            {/* 分隔线 */}
            <div className="w-px h-4 bg-border-dark mx-1" />

            {/* 保存按钮 */}
            <button
              onClick={handleSave}
              className={`flex items-center gap-1 px-3 py-1 text-[11px] font-medium text-white rounded transition-all ${
                saveStatus === 'saving'
                  ? 'bg-accent-blue/70 animate-pulse cursor-not-allowed'
                  : saveStatus === 'saved'
                    ? 'bg-green-600 hover:bg-green-500'
                    : saveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-accent-blue hover:bg-accent-blue/90'
              }`}
            >
              {saveStatus === 'saved' ? (
                <><span className="material-symbols-outlined text-[14px]">check</span><span>已保存</span></>
              ) : saveStatus === 'error' ? (
                <><span className="material-symbols-outlined text-[14px]">error</span><span>失败</span></>
              ) : (
                <><span className="material-symbols-outlined text-[14px]">save</span><span>保存</span></>
              )}
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
            onRegisterFitView={(fn) => { fitViewFnRef.current = fn; }}
          />
          {/* 右侧面板 */}
          <div className="flex flex-col w-56 shrink-0 border-l border-[#2d333f]">
            <PropertyPanel
              selectedNodes={selectedNodes}
              onReset={resetToDefault}
              onExportJSON={handleExportJSON}
              onImportJSON={handleImportJSON}
            />
            <PreviewPanel material={material} error={compileError} />
          </div>
        </div>

        {/* 状态栏 */}
        <footer className="h-6 bg-header-dark border-t border-border-dark px-3 flex items-center justify-between text-[9px] text-slate-500 shrink-0 select-none">
          <div className="flex items-center gap-1">
            {compileError ? (
              <>
                <span className="material-symbols-outlined text-[11px] text-red-400">error</span>
                <span className="text-red-400 truncate max-w-[300px]">{compileError}</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <span className="material-symbols-outlined text-[11px] text-accent-blue animate-spin">refresh</span>
                <span>保存中...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <span className="material-symbols-outlined text-[11px] text-green-400">check_circle</span>
                <span className="text-green-400">已保存</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <span className="material-symbols-outlined text-[11px] text-red-400">warning</span>
                <span className="text-red-400">保存失败</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[11px]">device_hub</span>
                <span>就绪</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>{nodes.length} 节点</span>
            <span>{edges.length} 连线</span>
          </div>
        </footer>
      </div>
    </ReactFlowProvider>
  );
};
