import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildNodeTree, findNodeByPath, findSubNodeFromGroup } from './modelHierarchy';

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

  it('透传空名称中间层节点，找到其子节点', () => {
    // 模拟 GLTF 常见结构：gltf.scene → '' (unnamed) → Cube006
    // buildNodeTree 对 '' 节点的子节点直接以其自身名称为路径（跳过空名父层）
    const root = new THREE.Group();
    const unnamed = new THREE.Object3D();
    unnamed.name = '';  // 空名节点
    const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    cube.name = 'Cube006';
    unnamed.add(cube);
    root.add(unnamed);

    // 路径 'Cube006' 应能穿透空名父节点找到 cube
    const found = findNodeByPath(root, 'Cube006');
    expect(found).toBe(cube);
  });

  it('深层空名节点透传', () => {
    const root = new THREE.Group();
    const unnamed = new THREE.Object3D();
    unnamed.name = '';
    const group = new THREE.Group();
    group.name = 'Body';
    const wheel = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    wheel.name = 'Wheel';
    group.add(wheel);
    unnamed.add(group);
    root.add(unnamed);

    expect(findNodeByPath(root, 'Body/Wheel')).toBe(wheel);
  });
});

describe('findSubNodeFromGroup', () => {
  it('从 parentGroup 子级中找到指定路径的节点', () => {
    // 模拟结构：parentGroup(name=uuid) > gltfScene(name='Scene') > Body
    const parentGroup = new THREE.Group();
    parentGroup.name = 'scene-object-uuid';

    const gltfScene = new THREE.Group();
    gltfScene.name = 'Scene'; // GLTF 场景根节点

    const body = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    body.name = 'Body';
    gltfScene.add(body);
    parentGroup.add(gltfScene);

    const found = findSubNodeFromGroup(parentGroup, 'Body');
    expect(found).toBe(body);
  });

  it('多级路径查找', () => {
    const parentGroup = new THREE.Group();
    parentGroup.name = 'uuid';

    const gltfScene = new THREE.Group();
    gltfScene.name = 'Scene';

    const armature = new THREE.Group();
    armature.name = 'Armature';

    const wheel = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    wheel.name = 'Wheel_L';

    armature.add(wheel);
    gltfScene.add(armature);
    parentGroup.add(gltfScene);

    const found = findSubNodeFromGroup(parentGroup, 'Armature/Wheel_L');
    expect(found).toBe(wheel);
  });

  it('路径不存在时返回 null', () => {
    const parentGroup = new THREE.Group();
    const gltfScene = new THREE.Group();
    gltfScene.name = 'Scene';
    parentGroup.add(gltfScene);

    expect(findSubNodeFromGroup(parentGroup, 'Missing/Node')).toBeNull();
  });

  it('parentGroup 没有子节点时返回 null', () => {
    const parentGroup = new THREE.Group();
    expect(findSubNodeFromGroup(parentGroup, 'Body')).toBeNull();
  });
});
