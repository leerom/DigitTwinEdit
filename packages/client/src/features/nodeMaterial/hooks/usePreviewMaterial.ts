// packages/client/src/features/nodeMaterial/hooks/usePreviewMaterial.ts
import { useEffect, useRef, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NodeRFData, NodeGraphData } from '@/types';

// 使用 any 避免在模块顶层加载 Three.js（测试环境友好）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMaterial = any;

export function usePreviewMaterial(nodes: Node[], edges: Edge[]) {
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
            type: n.type ?? (n.data as unknown as NodeRFData).typeKey,
            position: n.position,
            data: n.data as unknown as NodeRFData,
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
