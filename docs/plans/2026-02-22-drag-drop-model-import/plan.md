# 拖拽导入模型到场景 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 用户从 Models 面板将模型拖拽到三维视图（落在 y=0 地面位置）或层级视图（原点），将其添加到当前场景中，并在拖拽过程中显示高亮边框反馈。

**Architecture:** 新建共享 Hook `useAssetDrop` 封装拖放逻辑，通过模块级 `threeContextRef` 桥接 Canvas 内外的相机引用用于 raycasting，两个目标区域（SceneView、HierarchyPanel）通过该 hook 实现 drop 接收与高亮。

**Tech Stack:** React、Zustand（immer）、Three.js / @react-three/fiber、Vitest、@testing-library/react

**Design Doc:** `docs/plans/2026-02-22-drag-drop-model-import/design.md`

---

## 任务总览

| # | 任务 | 文件 |
|---|------|------|
| 1 | 扩展 `sceneStore.addAssetToScene` 支持可选坐标 | `stores/sceneStore.ts` + 测试 |
| 2 | 新建 `threeContext.ts` 桥接 Canvas 相机引用 | `features/viewport/threeContext.ts` |
| 3 | 新建 `useAssetDrop` 共享 Hook | `hooks/useAssetDrop.ts` + 测试 |
| 4 | 更新 `ProjectPanel` dragStart 写入 assetType | `components/panels/ProjectPanel.tsx` |
| 5 | 更新 `SceneView` 添加 drop 区域 + raycasting | `components/viewport/SceneView.tsx` |
| 6 | 更新 `HierarchyPanel` 添加 drop 区域 + 高亮 | `components/panels/HierarchyPanel.tsx` |

---

## Task 1: 扩展 `addAssetToScene` 支持坐标参数

**Files:**
- Modify: `packages/client/src/stores/sceneStore.ts:39`（接口）、`packages/client/src/stores/sceneStore.ts:311-350`（实现）
- Test: `packages/client/src/stores/sceneStore.addAsset.test.ts`（新建）

### Step 1: 写失败测试

新建 `packages/client/src/stores/sceneStore.addAsset.test.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSceneStore } from './sceneStore';

const mockAsset = {
  id: 1,
  project_id: 1,
  name: 'robot.glb',
  type: 'model' as const,
  file_path: '/uploads/robot.glb',
  file_size: 1024,
  created_at: '',
  updated_at: '',
};

describe('sceneStore - addAssetToScene', () => {
  beforeEach(() => {
    act(() => {
      useSceneStore.setState({
        scene: {
          id: 'test-scene',
          root: 'root',
          objects: {
            root: {
              id: 'root',
              name: 'Root',
              type: 'group' as const,
              parentId: null,
              children: [],
              visible: true,
              locked: false,
              transform: {
                position: [0, 0, 0] as [number, number, number],
                rotation: [0, 0, 0] as [number, number, number],
                scale: [1, 1, 1] as [number, number, number],
              },
              components: {},
            },
          },
          createdAt: '',
          updatedAt: '',
        },
      });
    });
  });

  it('坐标未传时使用原点 [0,0,0]', () => {
    act(() => {
      useSceneStore.getState().addAssetToScene(mockAsset);
    });
    const state = useSceneStore.getState();
    const ids = state.scene.objects['root'].children;
    expect(ids).toHaveLength(1);
    const obj = state.scene.objects[ids[0]];
    expect(obj.transform.position).toEqual([0, 0, 0]);
  });

  it('传入坐标时使用该坐标', () => {
    act(() => {
      useSceneStore.getState().addAssetToScene(mockAsset, [3, 0, -5]);
    });
    const state = useSceneStore.getState();
    const ids = state.scene.objects['root'].children;
    const obj = state.scene.objects[ids[0]];
    expect(obj.transform.position).toEqual([3, 0, -5]);
  });

  it('添加模型后场景标记为 dirty', () => {
    act(() => {
      useSceneStore.getState().addAssetToScene(mockAsset);
    });
    expect(useSceneStore.getState().isDirty).toBe(true);
  });

  it('非 model 类型资产抛出错误', () => {
    const textureAsset = { ...mockAsset, type: 'texture' as const };
    expect(() => {
      act(() => {
        useSceneStore.getState().addAssetToScene(textureAsset);
      });
    }).toThrow('Only model assets can be added to scene');
  });
});
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- sceneStore.addAsset
```

期望：FAIL，提示 "Expected 2 arguments, but got 1"（TypeScript 类型错误）或测试 "传入坐标时使用该坐标" 失败。

### Step 3: 修改 `sceneStore.ts` 接口和实现

**接口修改**（`packages/client/src/stores/sceneStore.ts:39`）：

```ts
// 将:
addAssetToScene: (asset: import('@digittwinedit/shared').Asset) => void;
// 改为:
addAssetToScene: (asset: import('@digittwinedit/shared').Asset, position?: [number, number, number]) => void;
```

**实现修改**（`packages/client/src/stores/sceneStore.ts:311`）：

```ts
// 将:
addAssetToScene: (asset) =>
// 改为:
addAssetToScene: (asset, position) =>
```

在 `transform` 对象中（`packages/client/src/stores/sceneStore.ts:329`）：

```ts
// 将:
position: [0, 0, 0],
// 改为:
position: position ?? [0, 0, 0],
```

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- sceneStore.addAsset
```

期望：4 个测试全部 PASS。

### Step 5: 提交

```bash
git add packages/client/src/stores/sceneStore.ts packages/client/src/stores/sceneStore.addAsset.test.ts
git commit -m "feat: addAssetToScene 支持可选 position 参数"
```

---

## Task 2: 新建 `threeContext.ts` 桥接相机引用

**Files:**
- Create: `packages/client/src/features/viewport/threeContext.ts`

**背景：** `useThree()` 只能在 R3F Canvas 内部调用，但 `onDrop` 在 Canvas 外部。通过模块级 ref 桥接，Canvas 内部组件 `ThreeContextCapture` 填充它，外部代码读取。

### Step 1: 创建文件

新建 `packages/client/src/features/viewport/threeContext.ts`：

```ts
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/**
 * 模块级引用，供 Canvas 外部的 onDrop 处理器访问 Three.js 相机。
 * 由 ThreeContextCapture 组件（放置在 Canvas 内部）填充。
 */
export const threeContextRef: { camera: THREE.Camera | null } = {
  camera: null,
};

/**
 * 放置在 R3F Canvas 内部，每帧同步相机引用到 threeContextRef。
 * 无渲染输出。
 */
export const ThreeContextCapture: React.FC = () => {
  const { camera } = useThree();
  useEffect(() => {
    threeContextRef.camera = camera;
    return () => {
      threeContextRef.camera = null;
    };
  }, [camera]);
  return null;
};
```

> **注意：** 此文件无需单元测试——它是一个极薄的桥接层，逻辑在使用它的组件中测试。

### Step 2: 提交

```bash
git add packages/client/src/features/viewport/threeContext.ts
git commit -m "feat: 新建 ThreeContextCapture 桥接 Canvas 相机引用"
```

---

## Task 3: 新建 `useAssetDrop` 共享 Hook

**Files:**
- Create: `packages/client/src/hooks/useAssetDrop.ts`
- Create: `packages/client/src/hooks/useAssetDrop.test.ts`

### Step 1: 写失败测试

新建 `packages/client/src/hooks/useAssetDrop.test.ts`：

```ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAssetDrop } from './useAssetDrop';

// ---- Mock stores ----
const mockAddAssetToScene = vi.fn();
const mockAssets = [
  {
    id: 42,
    project_id: 1,
    name: 'robot.glb',
    type: 'model' as const,
    file_path: '/uploads/robot.glb',
    file_size: 1024,
    created_at: '',
    updated_at: '',
  },
  {
    id: 99,
    project_id: 1,
    name: 'wood.png',
    type: 'texture' as const,
    file_path: '/uploads/wood.png',
    file_size: 512,
    created_at: '',
    updated_at: '',
  },
];

vi.mock('../stores/assetStore', () => ({
  useAssetStore: vi.fn((selector) => {
    const state = { assets: mockAssets };
    return selector ? selector(state) : state;
  }),
}));

vi.mock('../stores/sceneStore', () => ({
  useSceneStore: vi.fn((selector) => {
    const state = { addAssetToScene: mockAddAssetToScene };
    return selector ? selector(state) : state;
  }),
}));

// ---- dragEvent 工厂 ----
function makeDragEvent(options: {
  types?: string[];
  assetId?: string;
  preventDefault?: ReturnType<typeof vi.fn>;
}) {
  const data: Record<string, string> = {};
  if (options.assetId) data['assetid'] = options.assetId;

  return {
    dataTransfer: {
      types: options.types ?? (options.assetId ? ['assetid'] : []),
      getData: (key: string) => data[key.toLowerCase()] ?? '',
      dropEffect: '',
    },
    preventDefault: options.preventDefault ?? vi.fn(),
  } as unknown as React.DragEvent<HTMLElement>;
}

// ---- tests ----
describe('useAssetDrop', () => {
  beforeEach(() => vi.clearAllMocks());

  it('初始状态 isDraggingOver 为 false', () => {
    const { result } = renderHook(() => useAssetDrop());
    expect(result.current.isDraggingOver).toBe(false);
  });

  describe('onDragOver', () => {
    it('检测到 assetid 时调用 preventDefault 并设置 isDraggingOver=true', () => {
      const { result } = renderHook(() => useAssetDrop());
      const prevent = vi.fn();
      const evt = makeDragEvent({ types: ['assetid'], preventDefault: prevent });

      act(() => result.current.onDragOver(evt));

      expect(prevent).toHaveBeenCalled();
      expect(result.current.isDraggingOver).toBe(true);
    });

    it('无 assetid 时不调用 preventDefault，不改变 isDraggingOver', () => {
      const { result } = renderHook(() => useAssetDrop());
      const prevent = vi.fn();
      const evt = makeDragEvent({ types: ['Files'], preventDefault: prevent });

      act(() => result.current.onDragOver(evt));

      expect(prevent).not.toHaveBeenCalled();
      expect(result.current.isDraggingOver).toBe(false);
    });
  });

  describe('onDragLeave', () => {
    it('将 isDraggingOver 重置为 false', () => {
      const { result } = renderHook(() => useAssetDrop());
      // 先设置为 true
      act(() => result.current.onDragOver(makeDragEvent({ types: ['assetid'] })));
      expect(result.current.isDraggingOver).toBe(true);

      act(() => result.current.onDragLeave());
      expect(result.current.isDraggingOver).toBe(false);
    });
  });

  describe('onDrop', () => {
    it('模型资产调用 addAssetToScene，默认位置为 undefined（→ 原点）', () => {
      const { result } = renderHook(() => useAssetDrop());
      const evt = makeDragEvent({ assetId: '42' });

      act(() => result.current.onDrop(evt));

      expect(mockAddAssetToScene).toHaveBeenCalledWith(mockAssets[0], undefined);
    });

    it('传入 getDropPosition 时将计算的坐标传给 addAssetToScene', () => {
      const getPos = vi.fn().mockReturnValue([3, 0, -5] as [number, number, number]);
      const { result } = renderHook(() => useAssetDrop(getPos));
      const evt = makeDragEvent({ assetId: '42' });

      act(() => result.current.onDrop(evt));

      expect(getPos).toHaveBeenCalledWith(evt);
      expect(mockAddAssetToScene).toHaveBeenCalledWith(mockAssets[0], [3, 0, -5]);
    });

    it('非 model 类型资产不调用 addAssetToScene', () => {
      const { result } = renderHook(() => useAssetDrop());
      const evt = makeDragEvent({ assetId: '99' }); // texture

      act(() => result.current.onDrop(evt));

      expect(mockAddAssetToScene).not.toHaveBeenCalled();
    });

    it('找不到资产时不调用 addAssetToScene', () => {
      const { result } = renderHook(() => useAssetDrop());
      const evt = makeDragEvent({ assetId: '999' }); // 不存在

      act(() => result.current.onDrop(evt));

      expect(mockAddAssetToScene).not.toHaveBeenCalled();
    });

    it('onDrop 后 isDraggingOver 重置为 false', () => {
      const { result } = renderHook(() => useAssetDrop());
      act(() => result.current.onDragOver(makeDragEvent({ types: ['assetid'] })));
      act(() => result.current.onDrop(makeDragEvent({ assetId: '42' })));
      expect(result.current.isDraggingOver).toBe(false);
    });
  });
});
```

### Step 2: 运行测试确认失败

```bash
pnpm --filter client test -- useAssetDrop
```

期望：FAIL，提示 "Cannot find module './useAssetDrop'"。

### Step 3: 实现 `useAssetDrop.ts`

新建 `packages/client/src/hooks/useAssetDrop.ts`：

```ts
import { useState, useCallback } from 'react';
import { useAssetStore } from '@/stores/assetStore';
import { useSceneStore } from '@/stores/sceneStore';

type GetDropPosition = (e: React.DragEvent<HTMLElement>) => [number, number, number];

/**
 * 共享的资产拖放 Hook。
 *
 * @param getDropPosition - 可选，计算 drop 落点坐标的函数。
 *   不传时坐标为 undefined，sceneStore 会使用原点 [0,0,0]。
 *
 * @returns isDraggingOver, onDragOver, onDragLeave, onDrop
 */
export function useAssetDrop(getDropPosition?: GetDropPosition) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const assets = useAssetStore((state) => state.assets);
  const addAssetToScene = useSceneStore((state) => state.addAssetToScene);

  const onDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    // 只响应资产拖拽（浏览器将 dataTransfer key 转为小写）
    if (e.dataTransfer.types.includes('assetid')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setIsDraggingOver(true);
    }
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      setIsDraggingOver(false);

      const assetId = parseInt(e.dataTransfer.getData('assetId'), 10);
      const asset = assets.find((a) => a.id === assetId);
      if (!asset || asset.type !== 'model') return;

      const position = getDropPosition ? getDropPosition(e) : undefined;
      addAssetToScene(asset, position);
    },
    [assets, addAssetToScene, getDropPosition]
  );

  return { isDraggingOver, onDragOver, onDragLeave, onDrop };
}
```

### Step 4: 运行测试确认通过

```bash
pnpm --filter client test -- useAssetDrop
```

期望：7 个测试全部 PASS。

### Step 5: 提交

```bash
git add packages/client/src/hooks/useAssetDrop.ts packages/client/src/hooks/useAssetDrop.test.ts
git commit -m "feat: 新建 useAssetDrop hook，封装资产拖放逻辑"
```

---

## Task 4: 更新 `ProjectPanel` dragStart 写入 assetType

**Files:**
- Modify: `packages/client/src/components/panels/ProjectPanel.tsx:182-185`

**目的：** 将资产类型写入 dataTransfer，便于调试和未来扩展（当前 `onDragOver` 用 `assetid` key 判断，但 assetType 有助于区分拖拽内容）。

### Step 1: 修改 `handleAssetDragStart`

找到（`ProjectPanel.tsx:182`）：

```ts
const handleAssetDragStart = (e: React.DragEvent, assetId: number) => {
  e.dataTransfer.setData('assetId', assetId.toString());
  e.dataTransfer.effectAllowed = 'copy';
};
```

替换为：

```ts
const handleAssetDragStart = (e: React.DragEvent, assetId: number) => {
  const asset = assets.find((a) => a.id === assetId);
  e.dataTransfer.setData('assetId', assetId.toString());
  e.dataTransfer.setData('assetType', asset?.type ?? '');
  e.dataTransfer.effectAllowed = 'copy';
};
```

### Step 2: 运行全量测试确认无回归

```bash
pnpm --filter client test
```

期望：所有既有测试 PASS。

### Step 3: 提交

```bash
git add packages/client/src/components/panels/ProjectPanel.tsx
git commit -m "feat: dragStart 补充 assetType 到 dataTransfer"
```

---

## Task 5: 更新 `SceneView` 添加 drop 区域与 raycasting

**Files:**
- Modify: `packages/client/src/components/viewport/SceneView.tsx`

**关键点：**
- `ThreeContextCapture` 放在 `<Canvas>` 内，填充 `threeContextRef.camera`
- raycasting 在外层 div 的 `onDrop` 回调中执行，需要将鼠标位置转换为 NDC 坐标，再投射到 y=0 平面

### Step 1: 修改 `SceneView.tsx`

**添加导入**（文件顶部，现有导入之后）：

```ts
import * as THREE from 'three';
import { clsx } from 'clsx';
import { useCallback } from 'react'; // 已有 Suspense, useCallback
import { threeContextRef, ThreeContextCapture } from '@/features/viewport/threeContext';
import { useAssetDrop } from '@/hooks/useAssetDrop';
```

> 注意：检查文件中是否已有 `clsx` 和 `useCallback` 的导入，避免重复。

**在 `SceneView` 组件内**，`handleMouseUp` 之后添加：

```ts
const getSceneDropPosition = useCallback(
  (e: React.DragEvent<HTMLElement>): [number, number, number] => {
    const camera = threeContextRef.camera;
    if (!camera) return [0, 0, 0];

    const rect = e.currentTarget.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera as THREE.PerspectiveCamera);

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(groundPlane, target);

    // 若相机平行于地面（如俯视极端角度），intersectPlane 返回 null
    if (!hit) return [0, 0, 0];
    return [target.x, 0, target.z];
  },
  []
);

const { isDraggingOver, onDragOver, onDragLeave, onDrop } = useAssetDrop(getSceneDropPosition);
```

**外层 div 修改**（`SceneView.tsx:55-62`），在现有属性后添加 drop 相关属性：

```tsx
<div
  className={clsx(
    "w-full h-full relative bg-black",
    isDraggingOver && "ring-2 ring-inset ring-blue-400"
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

> `ring-blue-400` 使用蓝色高亮而非 `ring-primary`（若项目中已定义 `primary` 颜色可改为 `ring-primary`）。

**Canvas 内添加 ThreeContextCapture**（`SceneView.tsx:79`，`<Suspense>` 内第一行）：

```tsx
<Suspense fallback={null}>
  <ThreeContextCapture />   {/* ← 新增：填充 threeContextRef.camera */}
  <SceneConfigApplier />
  {/* ... 其余内容不变 ... */}
</Suspense>
```

### Step 2: 运行全量测试

```bash
pnpm --filter client test
```

期望：所有既有测试 PASS（SceneView 无单元测试，主要确认无 TS 编译错误）。

### Step 3: 手动验证

1. 启动 `pnpm dev:all`
2. 登录 → 打开项目 → 切换到 Models 文件夹
3. 拖拽一个模型卡片到三维视图
4. 确认：
   - 拖拽悬停时视图出现蓝色高亮边框
   - 松手后模型出现在鼠标落点对应的地面位置
   - 层级视图新增一个对象条目

### Step 4: 提交

```bash
git add packages/client/src/components/viewport/SceneView.tsx packages/client/src/features/viewport/threeContext.ts
git commit -m "feat: SceneView 支持模型拖拽放置，raycasting 计算落点"
```

---

## Task 6: 更新 `HierarchyPanel` 添加 drop 区域

**Files:**
- Modify: `packages/client/src/components/panels/HierarchyPanel.tsx`

### Step 1: 修改 `HierarchyPanel.tsx`

**添加导入**（顶部现有导入之后）：

```ts
import { clsx } from 'clsx'; // 若已有则跳过
import { useAssetDrop } from '../../hooks/useAssetDrop';
```

**在 `HierarchyPanel` 组件内**（`return` 之前）添加：

```ts
// 位置不传 → 默认原点 [0,0,0]
const { isDraggingOver, onDragOver, onDragLeave, onDrop } = useAssetDrop();
```

**外层 div 修改**（`HierarchyPanel.tsx:107`），将 `className` 改为动态，并添加 drop 事件：

```tsx
<div
  className={clsx(
    "flex flex-col h-full w-full bg-panel-dark flex-shrink-0",
    isDraggingOver && "ring-2 ring-inset ring-blue-400"
  )}
  onDragOver={onDragOver}
  onDragLeave={onDragLeave}
  onDrop={onDrop}
>
```

### Step 2: 运行全量测试

```bash
pnpm --filter client test
```

期望：所有测试 PASS。

### Step 3: 手动验证

1. 确保 `pnpm dev:all` 运行中
2. 拖拽模型到层级视图面板
3. 确认：
   - 悬停时层级面板出现蓝色高亮边框
   - 松手后对象出现在层级树根节点，位置为原点

### Step 4: 提交

```bash
git add packages/client/src/components/panels/HierarchyPanel.tsx
git commit -m "feat: HierarchyPanel 支持模型拖拽放置到场景根"
```

---

## 完成检查

全部任务完成后运行：

```bash
pnpm --filter client test
```

期望：所有测试 PASS，无新增测试失败。

**功能验收点：**
- [ ] 从 Models 文件夹拖拽模型到三维视图 → 放置在落点地面位置
- [ ] 从 Models 文件夹拖拽模型到层级视图 → 放置在原点，出现在层级树
- [ ] 拖拽过程中两个目标区域均有蓝色高亮边框
- [ ] 拖拽纹理/材质等非模型资产到两个目标区域 → 无反应（不报错）
- [ ] 拖拽到其他区域（如 Inspector 面板）→ 无反应（无 drop 事件）
