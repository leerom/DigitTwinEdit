// packages/client/src/features/nodeMaterial/hooks/usePreviewMaterial.ts
import { useEffect, useRef, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NodeRFData, NodeGraphData } from '@/types';
import { buildPreviewParams } from '../compiler/buildPreviewParams';

export type { PreviewParams } from '../compiler/buildPreviewParams';

export function usePreviewMaterial(nodes: Node[], edges: Edge[]) {
  const [params, setParams] = useState<import('../compiler/buildPreviewParams').PreviewParams | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
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
