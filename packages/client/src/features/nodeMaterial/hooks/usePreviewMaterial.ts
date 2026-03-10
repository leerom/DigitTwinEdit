// packages/client/src/features/nodeMaterial/hooks/usePreviewMaterial.ts
import { useEffect, useRef, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NodeRFData, NodeGraphData } from '@/types';

export interface PreviewParams {
  color: string;
  roughness: number;
  metalness: number;
  emissive: string;
}

export function usePreviewMaterial(nodes: Node[], edges: Edge[]) {
  const [params, setParams] = useState<PreviewParams | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const { buildPreviewParams } = await import('../compiler/tslCompiler');
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
        setParams(buildPreviewParams(graphData));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '编译失败');
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodes, edges]);

  return { params, error };
}
