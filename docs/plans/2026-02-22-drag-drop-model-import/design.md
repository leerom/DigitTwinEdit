# 拖拽导入模型到场景 - 设计文档

**日期**: 2026-02-22
**功能**: 用户通过鼠标拖拽 Models 面板中的模型到三维场景视图或层级视图，将模型添加到场景中。

---

## 需求摘要

| 拖拽目标 | 放置位置 | 视觉反馈 |
|---------|---------|---------|
| 三维场景视图（SceneView） | 鼠标落点对应的 y=0 地面坐标（raycasting） | 高亮边框 |
| 层级视图（HierarchyPanel） | 原点 (0, 0, 0)，添加到场景根节点 | 高亮边框 |

---

## 架构概览

### 数据流

```
[AssetCard 拖拽开始]
    → dataTransfer 存入 assetId + assetType
    ↓
[SceneView / HierarchyPanel onDragOver]
    → 检测到 'assetid' key → preventDefault() → 显示高亮边框
    ↓
[onDrop]
    → 读取 assetId → 从 assetStore 查找 asset
    → (SceneView) raycasting 算出 y=0 落点坐标
    → (HierarchyPanel) 位置固定 [0,0,0]
    → addAssetToScene(asset, position)
    ↓
[sceneStore] 创建 SceneObject，标记 isDirty
```

### 涉及文件

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新建 | `packages/client/src/features/viewport/threeContext.ts` | 存储 Three.js 相机引用，用于跨 Canvas 边界访问 |
| 新建 | `packages/client/src/hooks/useAssetDrop.ts` | 拖放逻辑共享 Hook |
| 修改 | `packages/client/src/components/viewport/SceneView.tsx` | 添加 drop 区域 + raycasting + 高亮 |
| 修改 | `packages/client/src/components/panels/HierarchyPanel.tsx` | 添加 drop 区域 + 高亮 |
| 修改 | `packages/client/src/stores/sceneStore.ts` | `addAssetToScene` 增加可选 `position` 参数 |
| 修改 | `packages/client/src/components/panels/ProjectPanel.tsx` | `dragStart` 补充 assetType 到 dataTransfer |

---

## 详细设计

### 1. `threeContext.ts`（新建）

**问题**：`useThree()` 只能在 React Three Fiber Canvas 内部调用，但 `onDrop` 事件处理在 Canvas 外部。需要桥接机制将相机引用暴露给外部。

**方案**：模块级 ref，由 Canvas 内部组件填充。

```ts
// packages/client/src/features/viewport/threeContext.ts
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export const threeContextRef: { camera: THREE.Camera | null } = {
  camera: null,
};

// 放在 Canvas 内部的组件，自动填充 ref
export const ThreeContextCapture: React.FC = () => {
  const { camera } = useThree();
  useEffect(() => {
    threeContextRef.camera = camera;
  });
  return null;
};
```

### 2. `useAssetDrop.ts`（新建）

**职责**：封装拖放状态管理、asset 查找、`addAssetToScene` 调用。位置计算策略通过参数注入。

```ts
// packages/client/src/hooks/useAssetDrop.ts
import { useState } from 'react';
import { useAssetStore } from '@/stores/assetStore';
import { useSceneStore } from '@/stores/sceneStore';

type GetDropPosition = (e: React.DragEvent<HTMLElement>) => [number, number, number];

export function useAssetDrop(getDropPosition?: GetDropPosition) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const { assets } = useAssetStore();
  const { addAssetToScene } = useSceneStore();

  const onDragOver = (e: React.DragEvent<HTMLElement>) => {
    if (e.dataTransfer.types.includes('assetid')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDraggingOver(true);
    }
  };

  const onDragLeave = () => setIsDraggingOver(false);

  const onDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const assetId = parseInt(e.dataTransfer.getData('assetId'));
    const asset = assets.find(a => a.id === assetId);
    if (!asset || asset.type !== 'model') return; // 非模型资产忽略
    const position = getDropPosition ? getDropPosition(e) : undefined;
    addAssetToScene(asset, position);
  };

  return { isDraggingOver, onDragOver, onDragLeave, onDrop };
}
```

**说明**：
- `onDragOver` 仅在检测到 `'assetid'` 时调用 `preventDefault()`（浏览器将 key 自动转为小写），防止接受其他拖拽内容
- `asset.type !== 'model'` 的情况静默忽略（无需提示，因为用户只能从 Models 文件夹拖拽）

### 3. `sceneStore.ts` 变更

在 `addAssetToScene` 签名中添加可选 `position` 参数：

```ts
addAssetToScene: (asset: Asset, position?: [number, number, number]) => void;
```

实现中将 `position ?? [0, 0, 0]` 传给 `transform.position`。

### 4. `SceneView.tsx` 变更

**raycasting 位置计算**：

```ts
const getSceneDropPosition = useCallback(
  (e: React.DragEvent<HTMLElement>): [number, number, number] => {
    const camera = threeContextRef.camera;
    if (!camera) return [0, 0, 0];

    const rect = e.currentTarget.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, target);

    return [target.x, 0, target.z];
  },
  []
);

const { isDraggingOver, onDragOver, onDragLeave, onDrop } = useAssetDrop(getSceneDropPosition);
```

**外层 div 修改**：

```tsx
<div
  className={clsx(
    "w-full h-full relative bg-black",
    isDraggingOver && "ring-2 ring-primary ring-inset"
  )}
  style={{ position: 'relative', cursor: cursorStyle }}
  onContextMenu={handleContextMenu}
  onMouseDown={handleMouseDown}
  onMouseUp={handleMouseUp}
  onDragOver={onDragOver}
  onDragLeave={onDragLeave}
  onDrop={onDrop}
>
```

**Canvas 内添加**：

```tsx
<ThreeContextCapture />
```

### 5. `HierarchyPanel.tsx` 变更

```tsx
const { isDraggingOver, onDragOver, onDragLeave, onDrop } = useAssetDrop();
// 不传 getDropPosition，默认使用 [0,0,0]

<div
  className={clsx(
    "flex flex-col h-full w-full bg-panel-dark flex-shrink-0",
    isDraggingOver && "ring-2 ring-primary ring-inset"
  )}
  onDragOver={onDragOver}
  onDragLeave={onDragLeave}
  onDrop={onDrop}
>
```

### 6. `ProjectPanel.tsx` 变更

`handleAssetDragStart` 额外写入 assetType（为 `onDragOver` 提供更精确的判断扩展性）：

```ts
const handleAssetDragStart = (e: React.DragEvent, assetId: number) => {
  const asset = assets.find(a => a.id === assetId);
  e.dataTransfer.setData('assetId', assetId.toString());
  e.dataTransfer.setData('assetType', asset?.type ?? '');
  e.dataTransfer.effectAllowed = 'copy';
};
```

---

## 边界情况

| 场景 | 处理方式 |
|------|---------|
| 拖拽非模型资产（材质/纹理）| 在 `onDrop` 中静默忽略（`asset.type !== 'model'`） |
| 相机引用未初始化 | fallback 到原点 `[0,0,0]` |
| 射线与 y=0 平面不相交（视线平行于地面）| `intersectPlane` 返回 null，fallback 到 `[0,0,0]` |
| 拖拽到场景视图边缘后离开 | `onDragLeave` 清除高亮 |

---

## 不在本次范围内

- 拖入层级视图时指定父节点（简化为始终添加到根）
- 拖拽预览（ghost image 自定义）
- 撤销/重做支持（可后续通过 HistoryStore 补充）
