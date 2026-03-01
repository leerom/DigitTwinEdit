# 子节点 Gizmo 变换支持 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在层级视图中选中 GLTF 模型的子节点后，Scene View 中的移动/旋转/缩放工具（TransformControls Gizmo）聚焦到该子节点，并支持实时变换编辑（与根对象行为一致）。

**Architecture:** 将 `ModelMesh` 的 `nodeOverrides` 处理拆分为两层：材质覆盖通过 `useMemo` 处理（仅材质变化时重建 clonedScene），变换覆盖通过单独 `useEffect` 命令式应用，从而避免拖拽期间 clonedScene 重建导致 TransformControls 断开。`ActiveToolGizmo` 通过遍历 rootGroup 子节点查找 Three.js 子节点，实时调用 `updateComponent` 写入 `nodeOverrides`。

**Tech Stack:** React 18, @react-three/fiber, @react-three/drei (TransformControls), Three.js, Zustand, TypeScript

---

## Task 1: 为 `modelHierarchy.ts` 添加 `findSubNodeFromGroup` 工具函数

**Files:**
- Modify: `packages/client/src/components/assets/modelHierarchy.ts`
- Test: `packages/client/src/components/assets/modelHierarchy.test.ts`

### Step 1: 写失败测试

在 `modelHierarchy.test.ts` 末尾添加新的 `describe` 块：

```typescript
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
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- --run src/components/assets/modelHierarchy.test.ts
```
预期：`findSubNodeFromGroup is not a function` 或 `Cannot find name 'findSubNodeFromGroup'`

### Step 3: 实现 `findSubNodeFromGroup`

在 `modelHierarchy.ts` 末尾追加：

```typescript
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
```

同时在 `modelHierarchy.test.ts` 顶部的 import 中加入 `findSubNodeFromGroup`：

```typescript
import { buildNodeTree, findNodeByPath, findSubNodeFromGroup } from './modelHierarchy';
```

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- --run src/components/assets/modelHierarchy.test.ts
```
预期：所有测试 PASS

### Step 5: 提交

```bash
git add packages/client/src/components/assets/modelHierarchy.ts packages/client/src/components/assets/modelHierarchy.test.ts
git commit -m "feat: add findSubNodeFromGroup helper to modelHierarchy"
```

---

## Task 2: 重构 `ModelMesh`，分离变换与材质的 `nodeOverrides` 处理

**Files:**
- Modify: `packages/client/src/features/scene/SceneRenderer.tsx:41-180`

这是本功能的核心重构。目标：让 `clonedScene` 不因变换覆盖变化而重建，避免拖拽中断。

### Step 1: 手动验证当前行为（基线）

启动开发服务器后，在 Scene View 中选中一个含子节点的 GLTF 模型，在层级视图选中其子节点，用 Inspector 修改子节点位置。确认它能正常更新（基线可用）。

### Step 2: 在 `ModelMesh` 中添加 `nodeOverridesMaterialKey`

在 `clonedScene = useMemo(...)` 之前插入以下代码（位于 `ModelMesh` 组件内部）：

```typescript
// 仅包含 material 相关的稳定 key
// 当只有 transform 变化时，此 key 字符串内容不变，clonedScene useMemo 不重建
const nodeOverridesMaterialKey = useMemo(() => {
  if (!nodeOverrides) return '';
  const matOnly: Record<string, any> = {};
  for (const [path, override] of Object.entries(nodeOverrides)) {
    if (override.material) matOnly[path] = override.material;
  }
  return JSON.stringify(matOnly);
}, [nodeOverrides]);
```

### Step 3: 修改 `clonedScene` useMemo

**当前 useMemo（SceneRenderer.tsx 约 55-118 行）：**
- deps: `[gltfScene, nodeOverrides, materialSpec]`
- 在 `// ③ 应用节点级 nodeOverrides` 部分同时应用了 transform 和 material

**修改内容：**

1. 将 deps 改为 `[gltfScene, materialSpec, nodeOverridesMaterialKey]`
2. 在 `// ③` 节点覆盖部分，**移除** transform 应用，**保留** material 应用：

```typescript
// ③ 应用节点级 nodeOverrides 中的材质覆盖（变换覆盖由单独 useEffect 应用）
if (nodeOverrides) {
  for (const [path, override] of Object.entries(nodeOverrides)) {
    if (!override.material) continue;
    const node = findNodeByPath(clone, path);
    if (!node) continue;
    node.traverse((child) => {
      const m = child as THREE.Mesh;
      if (m.isMesh) {
        m.material = createThreeMaterial(override.material);
      }
    });
  }
}
```

完整的 `clonedScene` useMemo 结尾改为：
```typescript
}, [gltfScene, materialSpec, nodeOverridesMaterialKey]);
```

### Step 4: 添加变换 useEffect

在 `clonedScene` useMemo 之后、`renderMode` useEffect 之前，插入新的 useEffect：

```typescript
// 将 nodeOverrides 中的变换覆盖命令式地应用到 clonedScene 子节点
// 此 effect 在以下情况触发：① nodeOverrides.transform 变化（拖拽时）② clonedScene 重建后
useEffect(() => {
  if (!nodeOverrides) return;
  for (const [path, override] of Object.entries(nodeOverrides)) {
    if (!override.transform) continue;
    const node = findNodeByPath(clonedScene, path);
    if (!node) continue;
    if (override.transform.position) node.position.fromArray(override.transform.position);
    if (override.transform.rotation) {
      node.rotation.fromArray([
        ...override.transform.rotation,
        'XYZ',
      ] as [number, number, number, THREE.EulerOrder]);
    }
    if (override.transform.scale) node.scale.fromArray(override.transform.scale);
  }
}, [clonedScene, nodeOverrides]);
```

### Step 5: 手动测试

重启开发服务器，验证：
1. 选中 GLTF 子节点，在 Inspector 修改位置 → 子节点移动（功能不退化）
2. 材质变化（Inspector 改颜色）→ 颜色更新（功能不退化）
3. TypeScript 编译无报错：`pnpm --filter client build` 或查看 Vite 控制台

### Step 6: 提交

```bash
git add packages/client/src/features/scene/SceneRenderer.tsx
git commit -m "refactor(ModelMesh): separate transform and material nodeOverrides handling"
```

---

## Task 3: 更新 `ActiveToolGizmo` 以支持子节点 Gizmo

**Files:**
- Modify: `packages/client/src/features/editor/tools/ActiveToolGizmo.tsx`

### Step 1: 查看当前文件

读取 `packages/client/src/features/editor/tools/ActiveToolGizmo.tsx` 确认当前内容（共 79 行）。

### Step 2: 完整替换文件内容

将整个文件替换为以下内容（逐项修改说明见注释）：

```typescript
// src/features/editor/tools/ActiveToolGizmo.tsx
import { useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { useActiveTool } from '../hooks/useEditorState';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { findSubNodeFromGroup } from '@/components/assets/modelHierarchy';
import type { ToolType } from '../shortcuts/types';

/**
 * 获取 TransformControls 的模式
 */
const getControlsMode = (tool: ToolType): 'translate' | 'rotate' | 'scale' => {
  switch (tool) {
    case 'translate':
      return 'translate';
    case 'rotate':
      return 'rotate';
    case 'scale':
      return 'scale';
    case 'universal':
      return 'translate'; // 默认显示移动,可以扩展为多模式
    default:
      return 'translate';
  }
};

/**
 * 根据当前激活的工具渲染对应的 Gizmo。
 * 当 activeSubNodePath 有值时，Gizmo 附加到 GLTF 子节点；否则附加到根 SceneObject group。
 */
export const ActiveToolGizmo: React.FC = () => {
  const activeTool = useActiveTool();
  const { scene } = useThree();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const activeId = useEditorStore((state) => state.activeId);
  const activeSubNodePath = useEditorStore((state) => state.activeSubNodePath);
  const objects = useSceneStore((state) => state.scene.objects);
  const updateTransform = useSceneStore((state) => state.updateTransform);
  const updateComponent = useSceneStore((state) => state.updateComponent);
  const controlsRef = useRef<any>(null);

  // 获取选中的对象
  const selectedObjects = selectedIds.map((id) => objects[id]).filter(Boolean);

  // 手动工具或没有选中对象时不显示 Gizmo
  if (activeTool === 'hand' || selectedObjects.length === 0) {
    return null;
  }

  // 获取第一个选中对象的引用 (多选时只控制第一个)
  const primaryObject = selectedObjects[0];
  if (!primaryObject) {
    return null;
  }

  // 找到顶层 SceneObject 的 Three.js group
  const rootGroup = scene.getObjectByName(primaryObject.id);
  if (!rootGroup) {
    // 对象可能刚被删除/尚未挂载到 three scene
    return null;
  }

  // 决定 Gizmo 附加目标：有子节点路径 → 找子节点；否则用根 group
  let targetObject = rootGroup;
  const isSubNodeMode = !!activeSubNodePath && activeId === primaryObject.id;
  if (isSubNodeMode) {
    const subNode = findSubNodeFromGroup(rootGroup, activeSubNodePath);
    if (subNode) {
      targetObject = subNode;
    }
    // 如果子节点未找到（仍在加载），回退到根 group
  }

  const mode = getControlsMode(activeTool);

  return (
    <TransformControls
      ref={controlsRef}
      object={targetObject}
      mode={mode}
      onChange={() => {
        // Real-time update during drag
        if (!controlsRef.current?.dragging) return;
        const obj = controlsRef.current.object;
        if (!obj) return;

        const pos: [number, number, number] = [obj.position.x, obj.position.y, obj.position.z];
        const rot: [number, number, number] = [obj.rotation.x, obj.rotation.y, obj.rotation.z];
        const sc: [number, number, number] = [obj.scale.x, obj.scale.y, obj.scale.z];

        if (isSubNodeMode && activeId) {
          // 子节点模式：更新 nodeOverrides（不影响 clonedScene 重建）
          const modelComp = (objects[activeId]?.components as any)?.model ?? {};
          const existingOverrides = modelComp.nodeOverrides ?? {};
          updateComponent(activeId, 'model', {
            ...modelComp,
            nodeOverrides: {
              ...existingOverrides,
              [activeSubNodePath]: {
                ...(existingOverrides[activeSubNodePath] ?? {}),
                transform: {
                  position: pos,
                  rotation: rot,
                  scale: sc,
                },
              },
            },
          });
        } else {
          // 根对象模式：保持原有逻辑
          updateTransform(primaryObject.id, {
            position: pos,
            rotation: rot,
            scale: sc,
          });
        }
      }}
    />
  );
};
```

### Step 3: 检查 TypeScript

```bash
pnpm --filter client build 2>&1 | head -50
```
或在 Vite 开发服务器的控制台查看错误。预期：无类型错误。

常见问题排查：
- 若 `findSubNodeFromGroup` 找不到：确认在 `modelHierarchy.ts` 中已 export
- 若 `updateComponent` 类型不匹配：确认 sceneStore 中 `updateComponent` 签名为 `(id: string, componentKey: string, data: Record<string, unknown>) => void`

### Step 4: 手动功能测试

启动开发服务器 `pnpm dev:all`，在浏览器中：

1. **基础功能不退化**：
   - 选中普通几何体（Box/Sphere）→ Gizmo 出现并可正常移动/旋转/缩放
   - 选中根 GLTF 模型对象 → Gizmo 出现在根对象上

2. **子节点 Gizmo 新功能**：
   - 导入/选中一个 GLTF 模型（需有多层级子节点）
   - 在层级视图展开 GLTF，点击某个子节点
   - 预期：Gizmo 出现在子节点的世界空间位置（而非模型根位置）
   - 用移动工具拖拽 → 子节点实时移动
   - 用旋转工具拖拽 → 子节点实时旋转
   - 用缩放工具拖拽 → 子节点实时缩放
   - 拖拽后 Inspector 数值与 Gizmo 位置一致

3. **子节点切换**：
   - 在层级视图点击另一个子节点 → Gizmo 跟随新子节点
   - 点击根模型对象 → Gizmo 回到根对象

4. **变换持久化**：
   - 对子节点做移动后刷新页面（自动保存）→ 子节点位置保持不变

### Step 5: 提交

```bash
git add packages/client/src/features/editor/tools/ActiveToolGizmo.tsx
git commit -m "feat: support sub-node gizmo for GLTF models in ActiveToolGizmo"
```

---

## Task 4: 最终集成测试与完善

**Files:**
- Review: 以上所有修改的文件

### Step 1: 全量构建验证

```bash
pnpm build
```
预期：`shared`、`server`、`client` 均构建成功，无 TypeScript 错误。

### Step 2: 执行前端单元测试

```bash
pnpm --filter client test -- --run
```
预期：所有现有测试 PASS，`modelHierarchy.test.ts` 中新增测试也 PASS。

### Step 3: 边界情况验证

在浏览器中测试：

- **GLTF 加载中**：模型未加载完成时，点击子节点 → Gizmo 无报错，回退到根对象显示
- **子节点材质变化**：在子节点 Gizmo 拖拽过程中，切换 Inspector 材质 → 确认拖拽不中断（材质变化会触发 clonedScene 重建，但 Gizmo 应重新附加）
- **根节点选中后清除子节点**：在 Inspector 中修改根对象位置 → Gizmo 在根对象上正常工作

### Step 4: 最终提交

```bash
git add .
git commit -m "feat: GLTF sub-node gizmo transform support"
```

---

## 快速参考

### 关键文件位置
- 工具函数：`packages/client/src/components/assets/modelHierarchy.ts`
- 3D 渲染：`packages/client/src/features/scene/SceneRenderer.tsx`
- Gizmo：`packages/client/src/features/editor/tools/ActiveToolGizmo.tsx`
- 状态存储：`packages/client/src/stores/editorStore.ts`（`activeSubNodePath`）
- 状态存储：`packages/client/src/stores/sceneStore.ts`（`updateComponent`）

### 运行命令
```bash
pnpm dev:all                                    # 启动前后端开发服务器
pnpm --filter client test -- --run              # 所有单元测试
pnpm --filter client test -- --run src/components/assets/modelHierarchy.test.ts  # 仅 modelHierarchy 测试
pnpm build                                      # 全量构建
```

### 核心设计决策
- **为什么分离 nodeOverridesMaterialKey？**：让 clonedScene useMemo 不因 transform 变化重建，避免 TransformControls 断开持有引用
- **为什么用 useEffect 应用变换？**：命令式更新 Three.js 对象属性，无需 React 重建，与 TransformControls 实时修改同一对象是幂等的
- **为什么遍历 rootGroup.children？**：不需要维护全局注册表，GLTF 节点名与 SceneObject UUID 格式完全不同，不会误匹配
