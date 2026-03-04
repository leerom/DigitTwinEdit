# 三维对象属性补充设计文档

**日期：** 2026-03-04
**目标：** 为 MESH 和 GROUP 对象在属性检视器中新增"阴影（产生/接收）、可见性、视锥体裁剪、渲染顺序"4 项属性，并修复渲染器中相关属性未生效的 Bug。

---

## 背景

当前状态：
- `MeshComponent` 已有 `castShadow: boolean` 和 `receiveShadow: boolean` 字段，但 `SceneRenderer` 将其**硬编码**为始终 true，导致字段无效。
- `SceneObject` 已有 `visible: boolean` 顶层字段，但 `SceneRenderer` 的 `<group>` 未传入，导致可见性切换无效。
- Inspector 中 MESH 对象没有专属属性面板，4 项属性均无 UI 入口。
- `CameraProp.tsx` 已实现相同 4 项属性，可作为参考模板。

---

## 方案选择

采用**方案 A（按对象类型分开存储）**：
- MESH：扩展 `MeshComponent`，补充缺失字段
- GROUP：属性存于 `SceneObject` 顶层（与 `visible` 并列）
- 与现有 `CameraProp` 模式一致，改动范围最小

---

## 数据模型变更

### `packages/client/src/types/index.ts`

**MeshComponent 新增字段：**

```typescript
export interface MeshComponent {
  assetId: string;
  materialId: string;
  material?: MaterialSpec;
  geometry?: 'box' | 'sphere' | 'plane' | 'cylinder' | 'torus' | 'capsule';
  castShadow: boolean;       // 已存在
  receiveShadow: boolean;    // 已存在
  materialAssetId?: number;
  frustumCulled?: boolean;   // 新增，默认 true
  renderOrder?: number;      // 新增，默认 0
}
```

**SceneObject 新增顶层字段（GROUP 使用）：**

```typescript
export interface SceneObject {
  // ... 已有字段 (id, name, type, parentId, children, visible, locked, transform, components)
  castShadow?: boolean;      // 新增，GROUP 使用
  receiveShadow?: boolean;   // 新增，GROUP 使用
  frustumCulled?: boolean;   // 新增，GROUP 使用
  renderOrder?: number;      // 新增，GROUP 使用
}
```

> 所有新字段均为可选，带合理默认值，向后兼容现有场景数据。

---

## 渲染器变更

### `packages/client/src/features/scene/SceneRenderer.tsx`

**1. MESH 基础几何体（约第 421 行）：**

```jsx
// 修改前（硬编码）
<mesh castShadow receiveShadow geometry={geometry} material={materialRef.current}>

// 修改后（读取 MeshComponent）
<mesh
  castShadow={object.components?.mesh?.castShadow ?? true}
  receiveShadow={object.components?.mesh?.receiveShadow ?? true}
  frustumCulled={object.components?.mesh?.frustumCulled ?? true}
  renderOrder={object.components?.mesh?.renderOrder ?? 0}
  geometry={geometry}
  material={materialRef.current}
>
```

**2. MESH GLTF 模型（`ModelMesh` 组件）：**

将 4 个属性作为 props 透传给 `ModelMesh`，在 `ModelMesh` 内部遍历子 Mesh 时一并设置：
- `castShadow`, `receiveShadow`, `frustumCulled`, `renderOrder`

**3. 外层 `<group>`（修复 visible 及 GROUP 属性）：**

```jsx
<group
  ref={groupRef}
  name={id}
  position={position}
  rotation={rotation}
  scale={scale}
  visible={object.visible}
  castShadow={object.castShadow}
  receiveShadow={object.receiveShadow}
  frustumCulled={object.frustumCulled ?? true}
  renderOrder={object.renderOrder ?? 0}
  onClick={handleClick}
>
```

> `visible` 同时对 MESH 和 GROUP 生效，一并修复现有 visible 不生效的 Bug。

---

## Inspector UI

### 新建文件

- `packages/client/src/components/inspector/specific/MeshProp.tsx`
- `packages/client/src/components/inspector/specific/MeshProp.test.tsx`

### UI 结构

```
对象属性 (Object)
├── 阴影         [产生 ☑]  [接收 ☑]
├── 可见性        [☑]
├── 视锥体裁剪    [☑]
└── 渲染顺序      [0    ↑↓]
```

### 数据读取策略

| 字段 | MESH 读取路径 | GROUP 读取路径 |
|------|-------------|--------------|
| castShadow | `object.components.mesh.castShadow` | `object.castShadow` |
| receiveShadow | `object.components.mesh.receiveShadow` | `object.receiveShadow` |
| frustumCulled | `object.components.mesh.frustumCulled` | `object.frustumCulled` |
| renderOrder | `object.components.mesh.renderOrder` | `object.renderOrder` |
| visible | `object.visible`（顶层） | `object.visible`（顶层） |

### 更新路径

| 字段 | MESH 更新方式 | GROUP 更新方式 |
|------|------------|--------------|
| castShadow / receiveShadow / frustumCulled / renderOrder | `updateComponent(id, 'mesh', {...})` | `updateObject(id, {...})` |
| visible | `updateObject(id, {visible})` | `updateObject(id, {visible})` |

### InspectorPanel 挂载

在 Transform 区块之后、材质之前，对 MESH 和 GROUP 均显示：

```tsx
{(object.type === ObjectType.MESH || object.type === ObjectType.GROUP) && (
  <div className="border-t border-white/5 pt-4">
    <MeshProp objectIds={selectedIds} />
  </div>
)}
```

---

## 测试计划

`MeshProp.test.tsx` 测试用例（TDD 先写测试）：

| 测试用例 | 验证内容 |
|---------|---------|
| MESH — castShadow 默认值为 true | 未设置时 Checkbox 显示已选中 |
| MESH — 修改 castShadow | 调用 `updateComponent(id, 'mesh', {castShadow})` |
| MESH — 修改 visible | 调用 `updateObject(id, {visible})` |
| MESH — 修改 renderOrder | 调用 `updateComponent(id, 'mesh', {renderOrder: 5})` |
| GROUP — 修改 castShadow | 调用 `updateObject(id, {castShadow})` |
| GROUP — 修改 visible | 调用 `updateObject(id, {visible})` |
| 多选混合值 | Checkbox 显示 indeterminate 状态 |

---

## 验收标准

1. 选中 MESH 对象，Inspector 显示"对象属性 (Object)"区块，包含 4 项属性
2. 选中 GROUP 对象，同样显示该区块
3. 修改 castShadow 后，3D 视口中阴影实时变化
4. 修改 visible 后，对象在 3D 视口中立即隐藏/显示
5. 修改 frustumCulled 后，Three.js 对象的 frustumCulled 属性更新
6. 修改 renderOrder 后，Three.js 对象的 renderOrder 属性更新
7. 所有 `MeshProp.test.tsx` 测试通过
8. 存量场景数据（无新字段）加载正常，默认值生效
