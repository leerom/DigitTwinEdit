import * as THREE from 'three';

export interface ModelNode {
  name: string;
  type: 'Mesh' | 'Group' | 'Object3D';
  path: string;  // 完整路径，如 "Root/Body/Wheel_L"
  children: ModelNode[];
}

/**
 * 从 Three.js Object3D 构建节点树，只保留 Mesh 和 Group 节点。
 * 跳过骨骼、灯光等辅助节点。
 */
export function buildNodeTree(
  obj: THREE.Object3D,
  parentPath = ''
): ModelNode[] {
  const nodes: ModelNode[] = [];

  for (const child of obj.children) {
    const isMesh = (child as THREE.Mesh).isMesh;
    const isGroup = child instanceof THREE.Group || child.type === 'Group';
    const isScene = child.type === 'Scene';
    // GLTF 容器节点常为 Object3D 基类（type === 'Object3D'），须显式保留
    const isObject3D = child.type === 'Object3D';

    if (!isMesh && !isGroup && !isScene && !isObject3D) continue;

    const path = parentPath ? `${parentPath}/${child.name}` : child.name;
    const nodeType: ModelNode['type'] = isMesh ? 'Mesh' : 'Group';

    const node: ModelNode = {
      name: child.name || '(unnamed)',
      type: nodeType,
      path,
      children: buildNodeTree(child, path),
    };
    nodes.push(node);
  }

  return nodes;
}

/**
 * 按路径从 Object3D 树中找到目标节点。
 * 路径格式："Root/Body/Wheel_L"
 */
export function findNodeByPath(
  root: THREE.Object3D,
  path: string
): THREE.Object3D | null {
  const parts = path.split('/');
  let current: THREE.Object3D = root;

  for (const part of parts) {
    const found = current.children.find((c) => c.name === part);
    if (!found) return null;
    current = found;
  }

  return current;
}
