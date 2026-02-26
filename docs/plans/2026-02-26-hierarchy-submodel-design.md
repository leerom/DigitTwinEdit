# 设计文档：Hierarchy 子模型展开 + Scene View 高亮 + Inspector 属性编辑

**日期：** 2026-02-26
**状态：** 已批准

---

## 背景

当用户在层级视图（HierarchyPanel）点击一个 GLTF 模型对象时，希望能：
1. 在 Hierarchy 中以树形结构展开该模型的内部 GLTF 节点（子网格/子组）
2. 点选子节点后，Scene View 中对该子网格显示蓝色包围盒高亮
3. Inspector 显示该子节点的 Transform 和材质属性，支持 Transform 编辑并持久化

---

## 架构总览

```
HierarchyPanel (展开 GLTF 节点树)
    │
    └──→ editorStore.setActiveSubNodePath(path)
              │
              ├──→ SceneRenderer/ModelMesh (包围盒高亮目标子网格)
              │
              └──→ InspectorPanel → SubNodeInspector (读写子节点属性)
                                          │
                                          └──→ sceneStore.nodeOverrides (持久化)
                                                       │
                                                       └──→ ModelMesh 加载时应用覆盖
```

---

## 数据模型变更

### 1. editorStore 新增字段

```typescript
// 当前活跃的 GLTF 子节点路径（仅对 MESH 类型含 model 的对象有效）
activeSubNodePath: string | null;
setActiveSubNodePath: (path: string | null) => void;
```

**重置时机：**
- 用户点击父模型条目（非子节点）
- 用户切换选中其他 SceneObject
- `clearSelection()` 被调用

**修改 `select` action**：选中新对象时自动将 `activeSubNodePath` 重置为 `null`。

---

### 2. SceneObject 数据模型新增 nodeOverrides

在 `packages/shared/src/types/scene.ts` 的 `MeshComponent` 中新增：

```typescript
interface MeshComponent {
  geometry?: GeometryType;
  model?: { assetId: number; path?: string };
  material?: MaterialSpec;
  // 新增：GLTF 子节点属性覆盖，key = nodePath（如 "RootNode/Wheel_L"）
  nodeOverrides?: Record<string, NodeOverride>;
}

interface NodeOverride {
  transform?: {
    position?: [number, number, number];
    rotation?: [number, number, number];  // Euler 角，单位：弧度
    scale?: [number, number, number];
  };
  material?: MaterialSpec;
}
```

`nodeOverrides` 作为 SceneObject 的一部分随场景数据保存到后端，不需要额外 API。

---

## 各模块改动

### 模块1：editorStore

**文件：** `packages/client/src/stores/editorStore.ts`

新增状态：
```typescript
activeSubNodePath: string | null;  // 初始值 null
setActiveSubNodePath: (path: string | null) => void;
```

修改 `select` action，选中新对象时重置：
```typescript
select: (ids, append = false) =>
  set((state) => ({
    selectedIds: newSelection,
    activeId: ...,
    activeSubNodePath: null,  // 切换对象时清除子节点选中
  })),
```

修改 `clearSelection`：
```typescript
clearSelection: () => set({ selectedIds: [], activeId: null, activeSubNodePath: null }),
```

---

### 模块2：HierarchyPanel — GltfNodeTree 组件

**新建文件：** `packages/client/src/components/panels/GltfNodeTree.tsx`

**功能：**
- 接收 `sceneObjectId: string` 和 `assetId: number`
- 用 `GLTFLoader` 懒加载 GLTF 节点树（复用 `buildNodeTree`，与 `ModelHierarchyExpander` 相同）
- 以缩进树形结构渲染，样式与 `HierarchyItem` 一致（`hierarchy-item` CSS 类）
- 点击节点：
  ```typescript
  select([sceneObjectId], false);
  setActiveSubNodePath(nodePath);
  ```

**集成到 HierarchyItem：**
- 当 `object.type === ObjectType.MESH && object.components?.mesh?.model?.assetId` 时，在展开子节点后渲染 `<GltfNodeTree>`
- GltfNodeTree 的每个节点都能被高亮（当 `activeSubNodePath === node.path` 时显示选中样式）

**UI 草图：**
```
▼ [场景名]
  ▼ [view_in_ar] 沙发模型        ← HierarchyItem（MESH）
      ▼ [folder] RootNode        ← GltfNodeTree 节点（Group）
          ■ [mesh] Cube006       ← 当前选中，高亮
          ■ [mesh] Cube
          ■ [mesh] Cylinder
```

---

### 模块3：SceneRenderer/ModelMesh — 子网格高亮

**文件：** `packages/client/src/features/scene/SceneRenderer.tsx`

`ModelMesh` 新增 prop：
```typescript
activeSubNodePath: string | null;
```

`ObjectRenderer` 读取 `editorStore.activeSubNodePath`，当当前对象是 `activeId` 时传入 `ModelMesh`。

**ModelMesh 内部高亮逻辑：**
```typescript
const highlightData = useMemo(() => {
  if (!activeSubNodePath) return null;
  const node = findNodeByPath(clonedScene, activeSubNodePath);
  if (!node) return null;
  const box = new THREE.Box3().setFromObject(node);
  if (box.isEmpty()) return null;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  return { center, size };
}, [clonedScene, activeSubNodePath]);

// JSX：
{highlightData && (
  <mesh position={highlightData.center.toArray()}>
    <boxGeometry args={[highlightData.size.x, highlightData.size.y, highlightData.size.z]} />
    <meshBasicMaterial wireframe color="#3b82f6" transparent opacity={0.8} />
  </mesh>
)}
```

---

### 模块4：SubNodeInspector 组件

**新建文件：** `packages/client/src/components/inspector/SubNodeInspector.tsx`

**触发条件：** `activeId` 非空 + `activeSubNodePath` 非空 + 对应 SceneObject 是含 model 的 MESH

**显示内容：**
- 节点名称（从路径末段提取）、类型图标
- Transform 面板（Position / Rotation / Scale），可编辑三轴输入
- 材质信息（只读：GLTF 材质名 + 类型，如 `MeshStandardMaterial`）

**数据流：**
1. 读取：用 `GLTFLoader` 加载资产（复用缓存），`findNodeByPath` 获取节点，从 Three.js object 读取 position/rotation/scale；同时叠加 `nodeOverrides[path].transform` 中的覆盖值
2. 写入：修改 Transform 后，调用：
   ```typescript
   sceneStore.updateComponent(activeId, {
     mesh: {
       nodeOverrides: {
         ...existing,
         [activeSubNodePath]: { transform: { position, rotation, scale } }
       }
     }
   });
   ```

---

### 模块5：ModelMesh 应用 nodeOverrides

**文件：** `packages/client/src/features/scene/SceneRenderer.tsx`（ModelMesh 组件内）

在 `clonedScene` 的 `useMemo` 中，材质克隆之后，遍历并应用 `nodeOverrides`：

```typescript
// 应用 nodeOverrides
if (nodeOverrides) {
  for (const [path, override] of Object.entries(nodeOverrides)) {
    const node = findNodeByPath(clone, path);
    if (!node) continue;
    if (override.transform?.position) node.position.fromArray(override.transform.position);
    if (override.transform?.rotation) node.rotation.fromArray([...override.transform.rotation, 'XYZ']);
    if (override.transform?.scale) node.scale.fromArray(override.transform.scale);
    if (override.material) {
      // 对该节点下所有 Mesh 应用材质覆盖
      node.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).material = createThreeMaterial(override.material!);
        }
      });
    }
  }
}
```

---

### 模块6：InspectorPanel 集成

**文件：** `packages/client/src/components/panels/InspectorPanel.tsx`

在有 `activeId` 的分支（场景对象检视模式）中，判断：
```typescript
const activeSubNodePath = useEditorStore(s => s.activeSubNodePath);
const object = objects[activeId];
const hasSubNodeSelected = !!activeSubNodePath
  && object?.type === ObjectType.MESH
  && !!object?.components?.mesh?.model?.assetId;
```

当 `hasSubNodeSelected` 为真时，在 TransformProp 位置改为渲染 `<SubNodeInspector>`。

---

## 不在范围内

- 子节点材质的完整编辑（颜色、粗糙度等），初版只读
- 子节点选中后加入 sceneStore 的 selectedIds（不创建虚拟 SceneObject）
- Undo/Redo 支持（nodeOverrides 变更暂不接入 HistoryStore）
- 子节点的 Gizmo 拖拽（只支持 Inspector 数字输入）

---

## 影响范围

| 文件 | 变更 |
|------|------|
| `packages/shared/src/types/scene.ts` | 新增 `NodeOverride` 类型和 `nodeOverrides` 字段 |
| `packages/client/src/stores/editorStore.ts` | 新增 `activeSubNodePath` 和 `setActiveSubNodePath` |
| `packages/client/src/components/panels/GltfNodeTree.tsx` | 新建 |
| `packages/client/src/components/panels/HierarchyPanel.tsx` | 集成 GltfNodeTree |
| `packages/client/src/features/scene/SceneRenderer.tsx` | ModelMesh 子网格高亮 + nodeOverrides 应用 |
| `packages/client/src/components/inspector/SubNodeInspector.tsx` | 新建 |
| `packages/client/src/components/panels/InspectorPanel.tsx` | 集成 SubNodeInspector |
