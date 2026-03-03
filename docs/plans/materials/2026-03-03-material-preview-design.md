# 材质预览窗口设计文档

**日期：** 2026-03-03
**功能：** Inspector 底部固定材质预览面板
**状态：** 已批准，待实施

---

## 需求

当用户点击 Materials 文件夹中的材质资产时，Inspector 底部显示一个固定的「材质预览」窗口：

1. 默认展示使用该材质的三维球体，支持切换为立方体或平面
2. 鼠标左键旋转三维对象
3. 鼠标滚轮缩放三维对象
4. 用户修改材质参数时，预览中的材质实时更新

---

## 整体架构

### 涉及文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `stores/materialStore.ts` | 添加 2 个字段 | `previewSpec` + `setPreviewSpec` |
| `components/inspector/MaterialAssetProp.tsx` | 各增 1 行 | `handleTypeChange` / `handlePropChange` / 加载 effect 同时调用 `setPreviewSpec` |
| `components/inspector/MaterialPreview.tsx` | 新建 | 独立 3D 预览组件 |
| `components/panels/InspectorPanel.tsx` | 添加底部区域 + 清理 effect | 材质检视模式下在滚动区下方插入固定预览 |

### 数据流

```
用户选中材质
  → MaterialAssetProp 加载 spec → setPreviewSpec(localSpec)   ← 初始化预览

用户修改参数
  → handlePropChange/handleTypeChange
      → setLocalSpec(newSpec)                                   ← 本地 UI 更新
      → setPreviewSpec(newSpec)                                 ← 实时同步预览
      → syncMaterialAsset(assetId, newSpec)                    ← 同步场景对象
      → debounced updateMaterialSpec(500ms)                    ← 异步保存服务端

MaterialPreview
  → 订阅 materialStore.previewSpec
  → createThreeMaterial(previewSpec) 创建 Three.js 材质
  → 应用到当前形状（球 / 立方体 / 平面）
```

`MaterialPreview` 与 `MaterialAssetProp` 完全解耦，无 props 传递。

---

## Store 改动（`materialStore.ts`）

```ts
// State
previewSpec: MaterialSpec | null;

// Action
setPreviewSpec: (spec: MaterialSpec | null) => void;

// 实现
previewSpec: null,
setPreviewSpec: (spec) => set({ previewSpec: spec }),
```

---

## `MaterialAssetProp.tsx` 接线

```ts
const setPreviewSpec = useMaterialStore((s) => s.setPreviewSpec);

// 1. 加载时初始化预览
useEffect(() => {
  materialsApi.getMaterial(assetId).then((data) => {
    const spec = { type: data.type, props: data.properties };
    setLocalSpec(spec);
    setPreviewSpec(spec);   // ← 新增
  });
}, [assetId]);

// 2. 修改 type 时同步
const handleTypeChange = (nextType) => {
  const newSpec = { type: nextType, props: localSpec.props };
  setLocalSpec(newSpec);
  setPreviewSpec(newSpec);   // ← 新增
  syncMaterialAsset(assetId, newSpec);
  scheduleUpdate(newSpec);
};

// 3. 修改 prop 时同步
const handlePropChange = (key, value) => {
  const newSpec = { ...localSpec, props: { ...localSpec.props, [key]: value } };
  setLocalSpec(newSpec);
  setPreviewSpec(newSpec);   // ← 新增
  syncMaterialAsset(assetId, newSpec);
  scheduleUpdate(newSpec);
};
```

---

## `MaterialPreview` 组件设计

### UI 布局

```
┌─────────────────────────────────┐
│ 预览  [●球体] [■立方体] [▬平面]  │  ← 标题行 + 形状切换按钮
├─────────────────────────────────┤
│                                 │
│         Three.js Canvas         │  ← 高度 180px
│                                 │
└─────────────────────────────────┘
  左键旋转 · 滚轮缩放               ← 操作提示
```

### 技术规格

**Canvas：**
- `frameloop="demand"`（按需渲染，节省性能）
- 相机：`position=[0,0,3]`，`fov=45`，`near=0.01`，`far=1000`
- `gl={{ antialias: true }}`

**控制器：**
- `OrbitControls`，`enableZoom={true}`，`enablePan={false}`，`enableRotate={true}`
- 左键旋转，滚轮缩放（与需求一致）

**灯光（复用 `ModelPreview` 配置）：**
- `ambientLight intensity={0.6}`
- `directionalLight position={[2,4,2]} intensity={1.2}`
- `directionalLight position={[-2,-1,-2]} intensity={0.3}`

**形状：**

| 形状 | Three.js Geometry | 默认 |
|------|------------------|------|
| 球体 | `SphereGeometry(0.8, 32, 32)` | ✓ |
| 立方体 | `BoxGeometry(1.2, 1.2, 1.2)` | |
| 平面 | `PlaneGeometry(1.6, 1.6)` | |

形状切换为本地 state，不影响材质。

**材质更新：**
- 订阅 `materialStore.previewSpec`
- `previewSpec` 引用变化 → `dispose()` 旧实例，`createThreeMaterial(previewSpec)` 新建
- `previewSpec = null` → 使用默认灰色 `new THREE.MeshStandardMaterial()`
- 组件卸载时 dispose 清理

### 在 `InspectorPanel.tsx` 中的位置

```tsx
// 材质检视模式，flex-1 滚动区之后：
<div className="shrink-0 border-t border-border-dark px-4 py-3">
  <MaterialPreview />
</div>
```

与 `ModelPreview` 在 model inspector 中的位置模式完全对称。

**清理（`InspectorPanel.tsx`）：**

```ts
// 离开材质检视模式时，清除 previewSpec
useEffect(() => {
  if (!selectedMaterial) {
    setPreviewSpec(null);
  }
}, [selectedMaterial]);
```

---

## 边界情况处理

| 场景 | 处理 |
|------|------|
| `previewSpec = null` | 使用默认灰色 `MeshStandardMaterial`，不显示空白 |
| KTX2 贴图纹理 | `createThreeMaterial` 已有异步加载逻辑，直接复用 |
| 切换形状（球→立方体） | 只改本地 shape state，复用同一 Three.js 材质实例 |
| 切换材质资产 | `assetId` 变化 → `useEffect` 重新加载 → `setPreviewSpec` 更新 |
| 组件卸载 | `materialRef.current?.dispose()` 释放 GPU 资源 |

---

## 参考

- `ModelPreview.tsx` — 3D 预览 Canvas 实现参考
- `materialFactory.ts` — `createThreeMaterial` 工厂函数
- `SceneRenderer.tsx` — 材质引用变化时重建实例的模式
