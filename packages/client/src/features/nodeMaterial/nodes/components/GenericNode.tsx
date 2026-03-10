// packages/client/src/features/nodeMaterial/nodes/components/GenericNode.tsx
import React from 'react';
import type { NodeProps } from '@xyflow/react';
import { NODE_REGISTRY } from '../nodeRegistry';
import { BaseNode } from './BaseNode';
import type { NodeRFData } from '@/types';

export const GenericNode: React.FC<NodeProps> = ({ data, selected }) => {
  const d = data as unknown as NodeRFData;
  const typeDef = NODE_REGISTRY[d.typeKey];
  if (!typeDef) return null;
  return <BaseNode typeDef={typeDef} selected={selected} />;
};
