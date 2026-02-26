import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildNodeTree, findNodeByPath } from './modelHierarchy';

describe('buildNodeTree', () => {
  it('提取 Mesh 和 Group 节点', () => {
    const root = new THREE.Group();
    root.name = 'Root';
    const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    body.name = 'Body';
    root.add(body);

    const tree = buildNodeTree(root);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('Body');
    expect(tree[0].type).toBe('Mesh');
    expect(tree[0].path).toBe('Body');
  });

  it('跳过非 Mesh/Group/Object3D 节点（灯光等）', () => {
    const root = new THREE.Group();
    root.name = 'Root';
    const light = new THREE.DirectionalLight();
    light.name = 'Sun';
    root.add(light);

    const tree = buildNodeTree(root);
    expect(tree).toHaveLength(0);
  });

  it('保留 GLTF 常见的 Object3D 容器节点及其子网格', () => {
    // 模拟 GLTF 加载后的典型结构：Scene > Object3D > Mesh
    const root = new THREE.Object3D();
    root.name = 'Scene';
    const container = new THREE.Object3D();
    container.name = 'RootNode';
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    mesh.name = 'Body';
    container.add(mesh);
    root.add(container);

    const tree = buildNodeTree(root);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('RootNode');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].name).toBe('Body');
    expect(tree[0].children[0].path).toBe('RootNode/Body');
  });

  it('生成正确的嵌套路径', () => {
    const root = new THREE.Group();
    const sub = new THREE.Group();
    sub.name = 'Body';
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    mesh.name = 'Wheel';
    sub.add(mesh);
    root.add(sub);

    const tree = buildNodeTree(root);
    expect(tree[0].children[0].path).toBe('Body/Wheel');
  });
});

describe('findNodeByPath', () => {
  it('按路径找到目标节点', () => {
    const root = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    body.name = 'Body';
    root.add(body);

    const found = findNodeByPath(root, 'Body');
    expect(found).toBe(body);
  });

  it('路径不存在时返回 null', () => {
    const root = new THREE.Group();
    expect(findNodeByPath(root, 'Missing')).toBeNull();
  });
});
