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
 *
 * 注意：buildNodeTree 对 name='' 的中间层节点（falsy parentPath）会跳过其在路径中
 * 的层级，导致其子节点路径直接用自身名称。这里同步处理：搜索时对 name='' 的节点
 * 做透传，继续在其 children 中搜索，与路径构建策略保持一致。
 */
export function findNodeByPath(
  root: THREE.Object3D,
  path: string
): THREE.Object3D | null {
  const parts = path.split('/').filter((p) => p !== '');
  if (parts.length === 0) return root;

  function search(node: THREE.Object3D, remaining: string[]): THREE.Object3D | null {
    if (remaining.length === 0) return node;
    const [target, ...rest] = remaining;

    for (const child of node.children) {
      if (child.name === target) {
        return search(child, rest);
      }
      // name='' 的节点在路径构建时被"透明化"，搜索时同样跳过向其子树继续查找
      if (!child.name) {
        const found = search(child, remaining);
        if (found) return found;
      }
    }
    return null;
  }

  return search(root, parts);
}

/**
 * 在 parentGroup 的直接子级中搜索 GLTF 子节点。
 * parentGroup 是 SceneObject 对应的 Three.js group（name=sceneObjectId）。
 * GLTF clonedScene 作为 parentGroup 的某个直接子级，findNodeByPath 可从中查找路径。
 *
 * @param parentGroup - 顶层 SceneObject 的 Three.js group（name=sceneObjectId）
 * @param path - 子节点路径，格式 "Root/Body/Wheel_L"
 */
export function findSubNodeFromGroup(
  parentGroup: THREE.Object3D,
  path: string
): THREE.Object3D | null {
  for (const child of parentGroup.children) {
    const found = findNodeByPath(child, path);
    if (found) return found;
  }
  return null;
}
