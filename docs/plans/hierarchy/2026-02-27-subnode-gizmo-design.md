# 设计文档：子节点 Gizmo 变换支持

**日期：** 2026-02-27
**功能：** 在层级视图中选中 GLTF 模型的子节点后，Scene View 中的移动/旋转/缩放工具聚焦到该子节点，并支持实时变换编辑。

---

## 背景与问题

当前 `ActiveToolGizmo` 始终将 `TransformControls` 附加到顶层 SceneObject 的 Three.js group（`scene.getObjectByName(sceneObjectId)`），即使用户在层级视图中选中了 GLTF 子节点（`activeSubNodePath` 已设置），Gizmo 仍显示在根 group 上，无法操控子节点。

同时，若直接在拖拽期间将子节点变换实时写入 `nodeOverrides`，会触发 `ModelMesh` 中 `clonedScene` 的 `useMemo` 重建，破坏 `TransformControls` 对 Three.js 对象的持有引用，导致拖拽中断。

---

## 方案选择

**选择方案 B：实时保存 + ModelMesh 变换/材质分离处理。**

核心思路：将 `nodeOverrides` 的材质覆盖与变换覆盖分离处理：
- `clonedScene` useMemo 只依赖材质相关数据（变换变化不触发重建）
- 变换覆盖通过单独 `useEffect` 命令式应用
- `ActiveToolGizmo` 实时调用 `updateComponent` 保存变换

---

## 数据流

```
用户在 GltfNodeTree 点击子节点
  → editorStore.setActiveSubNodePath("Root/Body/Wheel_L")
  → editorStore.select([sceneObjectId])

ActiveToolGizmo 渲染
  → rootGroup = scene.getObjectByName(sceneObjectId)
  → findSubNodeFromGroup(rootGroup, "Root/Body/Wheel_L") → Three.js 子节点
  → <TransformControls object={subNode} />

用户拖拽 Gizmo（onChange, dragging=true）
  → 读取 subNode.position/rotation/scale
  → updateComponent(sceneObjectId, 'model', { nodeOverrides: { [path]: { transform } } })

ModelMesh 响应
  → nodeOverrides 引用变化 → nodeOverridesMaterialKey 重计算
  → 仅 transform 变化 → key 字符串不变 → clonedScene useMemo 不重建 ✓
  → useEffect([clonedScene, nodeOverrides]) 触发
  → 命令式 node.position.fromArray(...) 更新（幂等）
  → TransformControls 持有同一 Three.js 对象 ✓
```

---

## 受影响文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `packages/client/src/components/assets/modelHierarchy.ts` | 扩展 | 新增 `findSubNodeFromGroup(parentGroup, path)` |
| `packages/client/src/features/scene/SceneRenderer.tsx` | 重构 | ModelMesh：分离 materialKey + transform useEffect |
| `packages/client/src/features/editor/tools/ActiveToolGizmo.tsx` | 扩展 | 支持子节点查找 + onChange 分支处理 |

---

## 关键实现细节

### `modelHierarchy.ts` 新增函数

```typescript
/**
 * 在 parentGroup 的直接子级中搜索 GLTF 子节点。
 * parentGroup 是 SceneObject 对应的 Three.js group（name=sceneObjectId）。
 * GLTF clonedScene 是 parentGroup 的某个直接子级。
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
```

### `ModelMesh` 依赖分离

```typescript
// ① 材质相关稳定 key（仅 material 内容变化时改变）
const nodeOverridesMaterialKey = useMemo(() => {
  if (!nodeOverrides) return '';
  const matOnly: Record<string, any> = {};
  for (const [path, override] of Object.entries(nodeOverrides)) {
    if (override.material) matOnly[path] = override.material;
  }
  return JSON.stringify(matOnly);
}, [nodeOverrides]);

// ② clonedScene 不依赖 nodeOverrides transform
const clonedScene = useMemo(() => {
  // clone + materialSpec + nodeOverrides.material only
}, [gltfScene, materialSpec, nodeOverridesMaterialKey]);

// ③ transform 命令式应用
useEffect(() => {
  if (!nodeOverrides) return;
  for (const [path, override] of Object.entries(nodeOverrides)) {
    const node = findNodeByPath(clonedScene, path);
    if (!node || !override.transform) continue;
    if (override.transform.position) node.position.fromArray(override.transform.position);
    if (override.transform.rotation)
      node.rotation.fromArray([...override.transform.rotation, 'XYZ']);
    if (override.transform.scale) node.scale.fromArray(override.transform.scale);
  }
}, [clonedScene, nodeOverrides]);
```

### `ActiveToolGizmo` 子节点逻辑

```typescript
// 当 activeSubNodePath 有值时，targetObject 指向 Three.js 子节点
if (activeSubNodePath && activeId === primaryObject.id) {
  targetObject = findSubNodeFromGroup(rootGroup, activeSubNodePath) ?? rootGroup;
}

// onChange 分支
if (activeSubNodePath && activeId) {
  // 子节点：更新 nodeOverrides
  const modelComp = objects[activeId]?.components?.model ?? {};
  const existingOverrides = (modelComp as any).nodeOverrides ?? {};
  updateComponent(activeId, 'model', {
    ...modelComp,
    nodeOverrides: {
      ...existingOverrides,
      [activeSubNodePath]: {
        ...(existingOverrides[activeSubNodePath] ?? {}),
        transform: { position, rotation, scale },
      },
    },
  });
} else {
  // 根对象：保持原逻辑
  updateTransform(primaryObject.id, { position, rotation, scale });
}
```

---

## 边界情况

- **子节点未找到**：`findSubNodeFromGroup` 返回 null → 回退到 rootGroup，Gizmo 显示在根对象上
- **切换选中对象**：`editorStore.select()` 已清除 `activeSubNodePath`，Gizmo 自动回到根对象
- **材质变化触发重建**：`clonedScene` 重建后，transform useEffect 重新应用所有变换 ✓
- **撤销/重做**：与根对象一致，Gizmo 拖拽变换不进入命令历史（与现有行为一致）

---

## 测试要点

1. 选中 GLTF 模型根节点 → Gizmo 在根 group 上（现有行为不变）
2. 在层级视图展开 GLTF 子节点，点击子节点 → Gizmo 出现在子节点世界位置
3. 用移动/旋转/缩放工具拖拽子节点 → 子节点实时移动，Inspector 数值同步
4. 切换到另一个子节点 → Gizmo 跟随
5. 点击根节点 → Gizmo 回到根对象
6. 在 Inspector 修改子节点 transform 后再用 Gizmo 拖拽 → 值连续（不丢失）
