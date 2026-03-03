# 材质预览窗口 实施计划

> **状态：** ✅ 已实施（2026-03-03）

**Goal:** 当用户在 Materials 面板点击材质资产时，Inspector 底部固定显示一个 3D 预览面板，支持球体/立方体/平面切换、鼠标旋转缩放，并在用户修改材质参数时实时更新。

**Architecture:** 在 `materialStore` 中新增 `previewSpec` 共享状态，`MaterialAssetProp` 在加载和每次参数变更时同步该状态，`MaterialPreview` 独立订阅并用 `createThreeMaterial` 驱动 Three.js Canvas；`InspectorPanel` 将预览面板插在材质检视分支的滚动区下方（与 `ModelPreview` 对称）。`MaterialPreview` 与 `MaterialAssetProp` 完全解耦，无 props 传递。

**Tech Stack:** React + TypeScript, @react-three/fiber, @react-three/drei (OrbitControls), Three.js, Zustand (materialStore)

**参考文件:**
- `components/inspector/ModelPreview.tsx` — Canvas + OrbitControls + 灯光配置
- `features/materials/materialFactory.ts` — `createThreeMaterial(spec, renderer)`
- `components/inspector/MaterialAssetProp.tsx` — 材质属性编辑组件

---

## Task 1: materialStore — 添加 previewSpec 状态

**Files:**
- Modify: `packages/client/src/stores/materialStore.ts`

**Context:**
`MaterialPreview` 通过订阅 store 状态感知当前预览材质，而不直接接收 props，实现与 `MaterialAssetProp` 的解耦。只需在现有 store 中追加两个字段。

**Step 1: 在 `MaterialState` interface 中添加字段**

在 `clearSaveError` 之后追加：

```ts
interface MaterialState {
  // ...existing fields...
  previewSpec: MaterialSpec | null;

  // ...existing actions...
  setPreviewSpec: (spec: MaterialSpec | null) => void;
}
```

**Step 2: 在 `create()` 实现中添加初始值和 action**

```ts
export const useMaterialStore = create<MaterialState>((set, get) => ({
  // ...existing state...
  previewSpec: null,

  // ...existing actions...
  setPreviewSpec: (spec) => set({ previewSpec: spec }),
}));
```

**Step 3: 验证**

```bash
pnpm --filter client exec tsc --noEmit
# 期望：无新增 TS 错误
```

**Step 4: Commit**

```bash
git add packages/client/src/stores/materialStore.ts
git commit -m "feat(material-store): 添加 previewSpec 字段支持材质预览"
```

---

## Task 2: MaterialAssetProp — 接线 setPreviewSpec

**Files:**
- Modify: `packages/client/src/components/inspector/MaterialAssetProp.tsx`

**Context:**
`MaterialAssetProp` 是材质资产的编辑 UI，需要在三个时机调用 `setPreviewSpec`：
1. 加载材质时（`assetId` 变化 → API 拉取 spec → 初始化预览）
2. 用户切换材质类型时（`handleTypeChange`）
3. 用户修改任意 prop 时（`handlePropChange`）

**Step 1: 订阅 setPreviewSpec**

在组件顶部 store 订阅处追加：

```ts
const setPreviewSpec = useMaterialStore((s) => s.setPreviewSpec);
```

**Step 2: 加载时初始化预览**

修改加载 `useEffect`，在 `setLocalSpec` 之后同步调用：

```ts
useEffect(() => {
  setIsLoadingSpec(true);
  materialsApi.getMaterial(assetId).then((data) => {
    const spec = { type: data.type as MaterialType, props: data.properties };
    setLocalSpec(spec);
    setPreviewSpec(spec);   // ← 新增
    setIsLoadingSpec(false);
  }).catch(() => setIsLoadingSpec(false));
}, [assetId]);
```

**Step 3: 修改 type 时同步**

```ts
const handleTypeChange = (nextType: MaterialType) => {
  const newSpec = { type: nextType, props: localSpec.props };
  setLocalSpec(newSpec);
  setPreviewSpec(newSpec);           // ← 新增
  syncMaterialAsset(assetId, newSpec);
  scheduleUpdate(newSpec);
};
```

**Step 4: 修改 prop 时同步**

```ts
const handlePropChange = (key: string, value: unknown) => {
  const newSpec = { ...localSpec, props: { ...localSpec.props, [key]: value } };
  setLocalSpec(newSpec);
  setPreviewSpec(newSpec);           // ← 新增
  syncMaterialAsset(assetId, newSpec);
  scheduleUpdate(newSpec);
};
```

**Step 5: 验证**

- 在浏览器中选中一个材质资产，确认 `materialStore.previewSpec` 非 null（可在 Zustand devtools 查看）

**Step 6: Commit**

```bash
git add packages/client/src/components/inspector/MaterialAssetProp.tsx
git commit -m "feat(material-asset-prop): 接线 setPreviewSpec 同步预览状态"
```

---

## Task 3: 新建 MaterialPreview 组件

**Files:**
- Create: `packages/client/src/components/inspector/MaterialPreview.tsx`

**Context:**
组件分两层：
- `MaterialPreview`（外层）：管理形状切换 state，渲染 Canvas 外壳和控件
- `PreviewMesh`（内层，Canvas 内部）：订阅 `previewSpec`，命令式管理 Three.js 材质实例生命周期

**材质生命周期设计（关键）：**
- 用 `matRef`（`useRef`）持有当前 Three.js 材质实例，不走 React state（避免多余重渲染）
- `previewSpec` 变化 → `useEffect` 重建材质：`dispose()` 旧实例 → `createThreeMaterial(previewSpec, gl)` → 赋给 `meshRef.current.material`
- 形状切换时 mesh 因 `key` prop 完整重建，通过 callback ref（`meshCallback`）在 mount 时将 `matRef.current` 赋给新 mesh
- 组件卸载时 cleanup effect 释放 GPU 资源

**Step 1: 创建文件**

```tsx
// packages/client/src/components/inspector/MaterialPreview.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMaterialStore } from '@/stores/materialStore';
import { createThreeMaterial } from '@/features/materials/materialFactory';

type ShapeType = 'sphere' | 'box' | 'plane';

const SHAPE_LABELS: Record<ShapeType, string> = {
  sphere: '球体',
  box: '立方体',
  plane: '平面',
};

const SHAPE_ICONS: Record<ShapeType, string> = {
  sphere: '●',
  box: '■',
  plane: '▬',
};

export const MaterialPreview: React.FC = () => {
  const [shape, setShape] = useState<ShapeType>('sphere');

  return (
    <div className="w-full">
      {/* 标题行 + 形状切换按钮 */}
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">预览</span>
        <div className="flex gap-1">
          {(['sphere', 'box', 'plane'] as ShapeType[]).map((s) => (
            <button
              key={s}
              title={SHAPE_LABELS[s]}
              onClick={() => setShape(s)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                shape === s
                  ? 'border-primary text-primary'
                  : 'border-[#2d333f] text-slate-500 hover:text-white hover:border-slate-500'
              }`}
            >
              {SHAPE_ICONS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Three.js Canvas */}
      <div className="w-full h-[180px] rounded overflow-hidden bg-[#0c0e14] border border-border-dark">
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0, 3], fov: 45, near: 0.01, far: 1000 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} />
          <directionalLight position={[-2, -1, -2]} intensity={0.3} />
          <PreviewMesh shape={shape} />
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            enableRotate={true}
            makeDefault
          />
        </Canvas>
      </div>
      <p className="text-[9px] text-slate-600 text-center mt-1">左键旋转 · 滚轮缩放</p>
    </div>
  );
};

// ---- 内部组件（必须在 Canvas 内部使用）----

function PreviewMesh({ shape }: { shape: ShapeType }) {
  const previewSpec = useMaterialStore((s) => s.previewSpec);
  const { gl, invalidate } = useThree();

  const meshRef = useRef<THREE.Mesh | null>(null);
  const matRef = useRef<THREE.Material | null>(null);

  // 当 previewSpec 引用变化时重建材质并应用到当前 mesh
  useEffect(() => {
    const old = matRef.current;
    const newMat = previewSpec
      ? createThreeMaterial(previewSpec, gl)
      : new THREE.MeshStandardMaterial();
    matRef.current = newMat;
    old?.dispose();
    if (meshRef.current) {
      meshRef.current.material = newMat;
      invalidate();
    }
  }, [previewSpec, gl, invalidate]);

  // 组件卸载时释放材质
  useEffect(() => {
    return () => {
      matRef.current?.dispose();
      matRef.current = null;
    };
  }, []);

  // callback ref：mesh 挂载时（形状切换导致 mesh 重建）将当前材质赋给新 mesh
  const meshCallback = useCallback(
    (node: THREE.Mesh | null) => {
      meshRef.current = node;
      if (node) {
        if (!matRef.current) {
          matRef.current = new THREE.MeshStandardMaterial();
        }
        node.material = matRef.current;
        invalidate();
      }
    },
    [invalidate],
  );

  // 使用 key 强制 mesh 在形状切换时完整重建，确保 callback ref 被重新触发
  if (shape === 'sphere') {
    return (
      <mesh key="sphere" ref={meshCallback}>
        <sphereGeometry args={[0.8, 32, 32]} />
      </mesh>
    );
  }
  if (shape === 'box') {
    return (
      <mesh key="box" ref={meshCallback}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
      </mesh>
    );
  }
  return (
    <mesh key="plane" ref={meshCallback}>
      <planeGeometry args={[1.6, 1.6]} />
    </mesh>
  );
}
```

**Step 2: 验证组件能正确编译**

```bash
pnpm --filter client exec tsc --noEmit
# 期望：无新增 TS 错误
```

**Step 3: Commit**

```bash
git add packages/client/src/components/inspector/MaterialPreview.tsx
git commit -m "feat(material-preview): 新建 3D 材质预览组件"
```

---

## Task 4: InspectorPanel — 集成预览面板 + 清理 effect

**Files:**
- Modify: `packages/client/src/components/panels/InspectorPanel.tsx`

**Context:**
在材质资产检视模式（`selectedMaterial` 分支）中：
1. 将 `flex-1 overflow-y-auto` 滚动区改为只包含 header + 属性编辑，预览固定在其下方（`shrink-0`）
2. 添加 cleanup `useEffect`：当 `selectedMaterial` 为 null 时清除 `previewSpec`，避免切换后 store 残留脏数据

布局模式与 `ModelPreview` 在 model inspector 中完全对称：
```
┌─────────────────────────────┐
│  flex-1 overflow-y-auto     │  ← 资产头部 + 属性编辑（可滚动）
├─────────────────────────────┤
│  shrink-0 border-t          │  ← MaterialPreview（固定，不随内容滚动）
└─────────────────────────────┘
```

**Step 1: 添加 import**

```ts
import { useEffect } from 'react';                          // 在已有 React import 中追加
import { MaterialPreview } from '../inspector/MaterialPreview';
```

**Step 2: 订阅 setPreviewSpec 并添加清理 effect**

在 `selectedMaterial` 计算之后插入：

```ts
const setPreviewSpec = useMaterialStore((s) => s.setPreviewSpec);

// 离开材质检视模式时清除 previewSpec
useEffect(() => {
  if (!selectedMaterial) {
    setPreviewSpec(null);
  }
}, [selectedMaterial, setPreviewSpec]);
```

**Step 3: 在材质检视分支底部插入预览区**

将现有材质检视 JSX 的结构：

```tsx
<div className="flex-1 overflow-y-auto custom-scrollbar">
  {/* header + 属性编辑 */}
</div>
```

改为：

```tsx
<div className="flex-1 overflow-y-auto custom-scrollbar">
  {/* header + 属性编辑（不变） */}
</div>
{/* 材质预览，固定在 Inspector 底部 */}
<div className="shrink-0 border-t border-border-dark px-4 py-3">
  <MaterialPreview />
</div>
```

**Step 4: 验证**

- 点击一个材质资产 → Inspector 底部出现预览球体
- 修改颜色/粗糙度等参数 → 预览球体实时更新
- 切换形状（球→立方体→平面）→ 材质保持不变，形状切换正常
- 左键旋转、滚轮缩放 → 正常交互
- 点击其他资产（模型/纹理）→ 预览面板消失，`previewSpec` 归 null

**Step 5: 构建验证**

```bash
cd packages/client && npx vite build
# 期望：✓ built in XX.XXs（无错误）
```

**Step 6: Commit**

```bash
git add packages/client/src/components/panels/InspectorPanel.tsx
git commit -m "feat(inspector-panel): 材质检视模式底部集成 MaterialPreview"
```

---

## 实施小结

| Task | 文件 | 变更行数 | 关键决策 |
|------|------|---------|---------|
| 1 | `materialStore.ts` | +5 | `previewSpec` 用 null 初始化，setter 直接 `set()` |
| 2 | `MaterialAssetProp.tsx` | +4 | 3 处调用 `setPreviewSpec`，与 `setLocalSpec` 紧邻 |
| 3 | `MaterialPreview.tsx` | +139（新建） | callback ref + key 解决形状切换时材质丢失问题 |
| 4 | `InspectorPanel.tsx` | +12 | `shrink-0` 固定预览不被滚动推走，cleanup effect 清洁 store |

**已合入提交：** `93b6342` feat(material-preview): 实现 Inspector 底部固定材质预览面板
