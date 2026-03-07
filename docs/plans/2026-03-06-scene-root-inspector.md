# Scene Root Inspector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 点击层级视图场景根目录行时，右侧属性检视器展示场景级配置（环境贴图、背景颜色、阴影类型），根目录行显示蓝色选中高亮。

**Architecture:** 在 `editorStore` 增加 `sceneRootSelected` 布尔标志，点击根目录行时置 `true`、选中对象时自动清除。新建 `SceneProp` 组件展示三类配置，`InspectorPanel` 根据该标志决定是否显示带标题头的场景检视器。阴影类型通过 `useSceneConfig` 钩子同步到 Three.js 渲染器。

**Tech Stack:** React + TypeScript，Zustand（immer），Three.js（`renderer.shadowMap.type`），Tailwind CSS

---

### Task 1: types/index.ts 新增 shadowMapType

**Files:**
- Modify: `packages/client/src/types/index.ts`

**Step 1: 在 `SceneSettings` 接口中追加可选字段**

在 `backgroundColor: string;` 行之后添加：

```ts
shadowMapType?: 'PCFSoftShadowMap' | 'PCFShadowMap' | 'VSMShadowMap';
```

**Step 2: 确认类型编译无误**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep "SceneSettings"
```

Expected: 无与 `SceneSettings` 相关的新错误（原有无关 TS 错误忽略）

**Step 3: Commit**

```bash
git add packages/client/src/types/index.ts
git commit -m "feat(types): add shadowMapType to SceneSettings"
```

---

### Task 2: sceneStore 新增 updateSceneSettings action

**Files:**
- Modify: `packages/client/src/stores/sceneStore.ts`

**Step 1: 在 store 接口（顶部 State/Actions 类型）中追加**

在 `setEnvironmentAsset` 行附近追加：

```ts
updateSceneSettings: (patch: Partial<import('@/types').SceneSettings>) => void;
```

**Step 2: 在 store 实现中追加 action**

在 `clearEnvironment` action 之后追加：

```ts
updateSceneSettings: (patch) =>
  set((state) => {
    Object.assign(state.scene.settings, patch);
    state.scene.updatedAt = new Date().toISOString();
    state.isDirty = true;
  }),
```

**Step 3: Commit**

```bash
git add packages/client/src/stores/sceneStore.ts
git commit -m "feat(sceneStore): add updateSceneSettings action"
```

---

### Task 3: editorStore 新增 sceneRootSelected + selectSceneRoot

**Files:**
- Modify: `packages/client/src/stores/editorStore.ts`

**Step 1: 在 State 接口中追加**

```ts
sceneRootSelected: boolean;
selectSceneRoot: () => void;
```

**Step 2: 初始状态中追加**

```ts
sceneRootSelected: false,
```

**Step 3: 实现 selectSceneRoot action**

```ts
selectSceneRoot: () =>
  set({ selectedIds: [], activeId: null, activeSubNodePath: null, sceneRootSelected: true }),
```

**Step 4: 修改 select action，在返回值中追加 `sceneRootSelected: false`**

现有 select 的 set() 调用，return 对象末尾追加：

```ts
sceneRootSelected: false,
```

注意 select 内有两处 set()（append 与非 append 分支），两处都要追加。

**Step 5: 修改 clearSelection action**

```ts
clearSelection: () =>
  set({ selectedIds: [], activeId: null, activeSubNodePath: null, sceneRootSelected: false }),
```

**Step 6: Commit**

```bash
git add packages/client/src/stores/editorStore.ts
git commit -m "feat(editorStore): add sceneRootSelected flag and selectSceneRoot action"
```

---

### Task 4: 新建 SceneProp 组件

**Files:**
- Create: `packages/client/src/components/inspector/SceneProp.tsx`

**Step 1: 创建组件文件**

```tsx
import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useAssetStore } from '@/stores/assetStore';

function isRuntimeIBLAsset(asset: { type: string; metadata?: unknown } | undefined): boolean {
  if (!asset || (asset.type !== 'texture' && asset.type !== 'image')) return false;
  const meta = asset.metadata as Record<string, unknown> | undefined;
  return meta?.usage === 'ibl' && !meta?.isSourceEnvironment && !meta?.isEnvironmentPreview;
}

export const SceneProp: React.FC = () => {
  const environment = useSceneStore((s) => s.scene.settings.environment);
  const backgroundColor = useSceneStore((s) => s.scene.settings.backgroundColor);
  const shadowMapType = useSceneStore((s) => s.scene.settings.shadowMapType ?? 'PCFSoftShadowMap');
  const setDefaultEnvironment = useSceneStore((s) => s.setDefaultEnvironment);
  const setEnvironmentAsset = useSceneStore((s) => s.setEnvironmentAsset);
  const updateSceneSettings = useSceneStore((s) => s.updateSceneSettings);

  const assets = useAssetStore((s) => s.assets);
  const environmentAssets = assets.filter(isRuntimeIBLAsset);
  const activeEnvironmentAsset = environment?.assetId
    ? assets.find((a) => a.id === environment.assetId)
    : undefined;

  return (
    <div className="p-4 space-y-5">
      {/* 环境贴图 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-xs text-primary">hdr_strong</span>
          <h3 className="text-[11px] font-bold text-slate-300">场景环境 (Environment)</h3>
        </div>
        <div className="rounded border border-border-dark bg-header-dark/30 p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">当前模式</span>
            <span className="text-slate-300">
              {environment?.mode === 'asset' && activeEnvironmentAsset
                ? `环境贴图 · ${activeEnvironmentAsset.name}`
                : '默认环境'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={setDefaultEnvironment}
              className="px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            >
              使用默认环境
            </button>
            {environmentAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setEnvironmentAsset(asset.id)}
                className="px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
              >
                {asset.name}
              </button>
            ))}
          </div>
          {environmentAssets.length === 0 && (
            <p className="text-slate-500">暂无可用环境资产，请先在 ProjectPanel 中导入 HDR/EXR。</p>
          )}
        </div>
      </div>

      {/* 背景颜色 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-xs text-primary">format_color_fill</span>
          <h3 className="text-[11px] font-bold text-slate-300">背景颜色 (Background)</h3>
        </div>
        <div className="rounded border border-border-dark bg-header-dark/30 p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">颜色</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => updateSceneSettings({ backgroundColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border border-border-dark bg-transparent"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => {
                  if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                    updateSceneSettings({ backgroundColor: e.target.value });
                  }
                }}
                className="w-20 bg-[#0c0e14] border border-border-dark text-white text-xs px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 阴影类型 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-xs text-primary">shadow</span>
          <h3 className="text-[11px] font-bold text-slate-300">阴影 (Shadows)</h3>
        </div>
        <div className="rounded border border-border-dark bg-header-dark/30 p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">阴影算法</span>
            <select
              value={shadowMapType}
              onChange={(e) =>
                updateSceneSettings({
                  shadowMapType: e.target.value as 'PCFSoftShadowMap' | 'PCFShadowMap' | 'VSMShadowMap',
                })
              }
              className="bg-[#0c0e14] border border-border-dark text-white text-xs px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="PCFSoftShadowMap">PCFSoft（柔和，推荐）</option>
              <option value="PCFShadowMap">PCF（标准）</option>
              <option value="VSMShadowMap">VSM（方差）</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add packages/client/src/components/inspector/SceneProp.tsx
git commit -m "feat(inspector): add SceneProp component with environment/background/shadow settings"
```

---

### Task 5: HierarchyPanel 根目录行可点击 + 高亮

**Files:**
- Modify: `packages/client/src/components/panels/HierarchyPanel.tsx`

**Step 1: 在 HierarchyPanel 组件中引入所需 store hooks**

在现有 import 中补充：

```ts
import { useAssetStore } from '../../stores/assetStore.js';
import { useMaterialStore } from '../../stores/materialStore.js';
import { clsx } from 'clsx';
```

（若 clsx 已有则跳过）

**Step 2: 在 HierarchyPanel 函数体内补充 hooks 调用**

```ts
const sceneRootSelected = useEditorStore((state) => state.sceneRootSelected);
const selectSceneRoot = useEditorStore((state) => state.selectSceneRoot);
const selectAsset = useAssetStore((state) => state.selectAsset);
const selectMaterial = useMaterialStore((state) => state.selectMaterial);
```

**Step 3: 新增点击处理函数**

```ts
const handleSceneRootClick = () => {
  selectSceneRoot();
  selectAsset(null);
  selectMaterial(null);
};
```

**Step 4: 将场景根目录行的静态 `<div>` 改为可点击并支持高亮**

将现有：

```tsx
<div className="hierarchy-item text-slate-400 font-semibold mb-1">
  <span className="material-symbols-outlined text-xs mr-1">expand_more</span>
  <span className="material-symbols-outlined text-xs mr-2 text-blue-400">deployed_code</span>
  <span>{sceneName}</span>
</div>
```

改为：

```tsx
<div
  className={clsx(
    "hierarchy-item font-semibold mb-1 cursor-pointer",
    sceneRootSelected
      ? "bg-primary/20 text-white border-l-2 border-primary"
      : "text-slate-400"
  )}
  onClick={handleSceneRootClick}
>
  <span className="material-symbols-outlined text-xs mr-1">expand_more</span>
  <span className="material-symbols-outlined text-xs mr-2 text-blue-400">deployed_code</span>
  <span>{sceneName}</span>
</div>
```

**Step 5: Commit**

```bash
git add packages/client/src/components/panels/HierarchyPanel.tsx
git commit -m "feat(hierarchy): make scene root row clickable with selection highlight"
```

---

### Task 6: InspectorPanel 场景检视器集成

**Files:**
- Modify: `packages/client/src/components/panels/InspectorPanel.tsx`

**Step 1: 导入新组件**

```ts
import { SceneProp } from '../inspector/SceneProp';
```

**Step 2: 读取 sceneRootSelected 状态**

在现有 `const activeId = useEditorStore(...)` 附近追加：

```ts
const sceneRootSelected = useEditorStore((state) => state.sceneRootSelected);
const sceneName = useProjectStore((state) => {
  const id = state.currentSceneId;
  return state.scenes.find((s) => s.id === id)?.name ?? '场景';
});
```

并补充 `useProjectStore` 的 import（若尚未导入）：

```ts
import { useProjectStore } from '../../stores/projectStore';
```

**Step 3: 在 `if (!activeId)` 块的最顶部（材质资产检视之前）插入场景根检视分支**

在：

```tsx
if (!activeId) {
  // 材质资产检视模式（优先于 model/texture）
  if (selectedMaterial) {
```

之间，插入：

```tsx
  // 场景根目录检视模式
  if (sceneRootSelected) {
    return (
      <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
        <div className="panel-title">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-xs">info</span>
            <span>属性检视器 (Inspector)</span>
          </div>
          <button className="material-symbols-outlined text-xs hover:text-white transition-colors">settings</button>
        </div>
        {/* 场景标题头部 */}
        <div className="p-4 border-b border-border-dark bg-header-dark/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-white/5">
              <span className="material-symbols-outlined text-primary">deployed_code</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium truncate">{sceneName}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Scene</p>
            </div>
          </div>
        </div>
        {/* 场景属性 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <SceneProp />
        </div>
      </div>
    );
  }
```

**Step 4: Commit**

```bash
git add packages/client/src/components/panels/InspectorPanel.tsx
git commit -m "feat(inspector): show scene properties when scene root is selected in hierarchy"
```

---

### Task 7: useSceneConfig 同步 shadowMapType 到 Three.js 渲染器

**Files:**
- Modify: `packages/client/src/features/scene/hooks/useSceneConfig.ts`

**Step 1: 追加 shadowMapType 同步逻辑**

将现有文件内容改为：

```ts
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from '../../../types';

/**
 * 应用场景配置的 Hook。
 * 同步背景色与阴影算法类型；环境光贴图由 SceneEnvironment 负责异步加载与清理。
 */
export function useSceneConfig(scene: Scene) {
  const { scene: threeScene, gl } = useThree();

  useEffect(() => {
    if (scene.settings.backgroundColor) {
      threeScene.background = new THREE.Color(scene.settings.backgroundColor);
    }
  }, [scene.settings.backgroundColor, threeScene]);

  useEffect(() => {
    const typeMap: Record<string, THREE.ShadowMapType> = {
      PCFShadowMap: THREE.PCFShadowMap,
      PCFSoftShadowMap: THREE.PCFSoftShadowMap,
      VSMShadowMap: THREE.VSMShadowMap,
    };
    const type = typeMap[scene.settings.shadowMapType ?? 'PCFSoftShadowMap'] ?? THREE.PCFSoftShadowMap;
    gl.shadowMap.type = type;
    gl.shadowMap.needsUpdate = true;
  }, [scene.settings.shadowMapType, gl]);
}
```

**Step 2: Commit**

```bash
git add packages/client/src/features/scene/hooks/useSceneConfig.ts
git commit -m "feat(sceneConfig): sync shadowMapType setting to Three.js renderer"
```

---

## 验证清单

1. 点击层级视图场景根目录行 → 根目录行蓝色高亮，Inspector 显示场景名称头部 + SceneProp
2. 在 Inspector 场景配置中切换环境贴图 → Scene View 环境光照改变
3. 修改背景颜色 → Scene View 背景立即变色
4. 切换阴影类型 → Three.js shadowMap.type 更新（可通过灯光阴影效果验证）
5. 点击场景中任意对象 → 根目录行高亮消失，Inspector 切回对象属性
6. 视口点击空白处（clearSelection）→ 根目录行不高亮，Inspector 回落到旧 fallback（无标题的场景环境视图）
7. 切换到资产/材质检视模式 → 根目录行不高亮
