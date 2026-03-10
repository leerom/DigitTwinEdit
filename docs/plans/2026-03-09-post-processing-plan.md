# Post-Processing 后处理功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为三维编辑器添加后处理效果管理功能，支持 UnrealBloom、Film、Bokeh、SSAO 四种效果的增删改排序，在 SceneProp 中管理并实时同步到 SceneView 渲染。

**Architecture:** 数据层新增 `PostProcessEffect[]` 存储在 `sceneStore.settings.postProcessing`；渲染层在 Canvas 内新建 `PostProcessingSystem` 组件使用 Three.js 原生 EffectComposer（`useFrame` 负优先级接管渲染循环）；UI 层在 `SceneProp.tsx` 新增分区，使用 `@dnd-kit/sortable` 拖拽排序，参数实时更新。

**Tech Stack:** React 19, Three.js 0.173, @react-three/fiber 9, Zustand + immer, @dnd-kit/sortable, TypeScript

**Design Doc:** `docs/plans/2026-03-09-post-processing-design.md`

---

## Task 1: 数据类型定义

**Files:**
- Modify: `packages/client/src/types/index.ts`（末尾新增类型）

**Step 1: 打开类型文件，找到末尾**

阅读 `packages/client/src/types/index.ts`，找到 `SceneSettings` 接口和 `normalizeSceneSettings` 函数。

**Step 2: 在 `types/index.ts` 末尾追加后处理类型**

在文件末尾（`Scene` 接口之前）添加：

```typescript
// ── 后处理效果类型 ──────────────────────────────────────────────
export type PostProcessEffectType = 'UnrealBloom' | 'Film' | 'Bokeh' | 'SSAO';

export interface UnrealBloomParams {
  threshold: number;
  strength: number;
  radius: number;
}

export interface FilmParams {
  intensity: number;
  grayscale: boolean;
}

export interface BokehParams {
  focus: number;
  aperture: number;
  maxblur: number;
}

export interface SSAOParams {
  radius: number;
  minDistance: number;
  maxDistance: number;
}

export type PostProcessParams =
  | UnrealBloomParams
  | FilmParams
  | BokehParams
  | SSAOParams;

export interface PostProcessEffect {
  id: string;
  type: PostProcessEffectType;
  enabled: boolean;
  params: PostProcessParams;
}
```

**Step 3: 在 `SceneSettings` 接口中新增字段**

找到 `SceneSettings` 接口，添加 `postProcessing` 字段：

```typescript
export interface SceneSettings {
  environment: SceneEnvironmentSettings;
  gridVisible: boolean;
  backgroundColor: string;
  shadowMapType?: 'PCFSoftShadowMap' | 'PCFShadowMap' | 'VSMShadowMap';
  postProcessing?: PostProcessEffect[];   // ← 新增
  [key: string]: any;
}
```

**Step 4: 验证类型检查通过**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | head -30
```

Expected: 0 新增错误（可忽略已有 TS6133 未使用变量错误）

**Step 5: Commit**

```bash
git add packages/client/src/types/index.ts
git commit -m "feat(types): add PostProcessEffect types to SceneSettings"
```

---

## Task 2: 默认参数常量与 Store Actions

**Files:**
- Create: `packages/client/src/features/postprocessing/defaultParams.ts`
- Modify: `packages/client/src/stores/sceneStore.ts`

**Step 1: 创建 `defaultParams.ts`**

```typescript
// packages/client/src/features/postprocessing/defaultParams.ts
import type { PostProcessEffectType, PostProcessParams } from '@/types';

export const POST_PROCESS_DEFAULTS: Record<PostProcessEffectType, PostProcessParams> = {
  UnrealBloom: { threshold: 0.85, strength: 1.5, radius: 0.4 },
  Film:        { intensity: 0.35, grayscale: false },
  Bokeh:       { focus: 1.0, aperture: 0.025, maxblur: 0.01 },
  SSAO:        { radius: 4, minDistance: 0.001, maxDistance: 0.1 },
};
```

**Step 2: 打开 `sceneStore.ts`，找到 actions 接口定义**

阅读 `packages/client/src/stores/sceneStore.ts`，找到 actions 接口（含 `updateSceneSettings` 的那段），了解现有 action 命名模式。

**Step 3: 在 SceneState 接口中添加 action 签名**

在接口中 `updateSceneSettings` 之后添加：

```typescript
addPostProcessEffect: (type: PostProcessEffectType) => void;
removePostProcessEffect: (id: string) => void;
togglePostProcessEffect: (id: string) => void;
updatePostProcessEffect: (id: string, params: Partial<PostProcessParams>) => void;
reorderPostProcessEffects: (newOrder: PostProcessEffect[]) => void;
```

注意同时在文件顶部导入新类型：

```typescript
import type {
  // ...已有导入...
  PostProcessEffectType,
  PostProcessParams,
  PostProcessEffect,
} from '@/types';
```

**Step 4: 实现 actions（在 `createActions` / `set(...)` 区域）**

找到 `updateSceneSettings` 实现，在其后添加：

```typescript
addPostProcessEffect: (type) =>
  set((state) => {
    const { v4: uuidv4 } = await import('uuid'); // 已有 uuid 导入，直接引用
    const existing = state.scene.settings.postProcessing ?? [];
    // 注意：uuid 已在文件顶部导入 (import { v4 as uuidv4 } from 'uuid')
    state.scene.settings.postProcessing = [
      ...existing,
      {
        id: uuidv4(),
        type,
        enabled: true,
        params: { ...POST_PROCESS_DEFAULTS[type] },
      },
    ];
    state.scene.updatedAt = new Date().toISOString();
    state.isDirty = true;
  }),

removePostProcessEffect: (id) =>
  set((state) => {
    state.scene.settings.postProcessing = (
      state.scene.settings.postProcessing ?? []
    ).filter((e) => e.id !== id);
    state.scene.updatedAt = new Date().toISOString();
    state.isDirty = true;
  }),

togglePostProcessEffect: (id) =>
  set((state) => {
    const effects = state.scene.settings.postProcessing ?? [];
    const effect = effects.find((e) => e.id === id);
    if (effect) effect.enabled = !effect.enabled;
    state.scene.updatedAt = new Date().toISOString();
    state.isDirty = true;
  }),

updatePostProcessEffect: (id, params) =>
  set((state) => {
    const effects = state.scene.settings.postProcessing ?? [];
    const effect = effects.find((e) => e.id === id);
    if (effect) Object.assign(effect.params, params);
    state.scene.updatedAt = new Date().toISOString();
    state.isDirty = true;
  }),

reorderPostProcessEffects: (newOrder) =>
  set((state) => {
    state.scene.settings.postProcessing = newOrder;
    state.scene.updatedAt = new Date().toISOString();
    state.isDirty = true;
  }),
```

> **注意**: `sceneStore.ts` 使用 immer 中间件，set 回调内可直接 mutate state，但对数组替换操作（`filter`、`...spread`）需要使用 `state.scene.settings.postProcessing = newArray` 赋值形式（immer 支持）。

**Step 5: 在 `addPostProcessEffect` 实现中正确引用 uuid**

检查文件顶部是否有 `import { v4 as uuidv4 } from 'uuid'`，如果有则直接用，不要 dynamic import。

**Step 6: 同时在 `addPostProcessEffect` 导入 defaultParams**

在文件顶部添加：
```typescript
import { POST_PROCESS_DEFAULTS } from '@/features/postprocessing/defaultParams';
```

**Step 7: 验证类型检查**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | head -30
```

Expected: 0 新增错误

**Step 8: Commit**

```bash
git add packages/client/src/features/postprocessing/defaultParams.ts \
        packages/client/src/stores/sceneStore.ts
git commit -m "feat(store): add postProcessing actions to sceneStore"
```

---

## Task 3: PostProcessingSystem 渲染组件

**Files:**
- Create: `packages/client/src/features/postprocessing/PostProcessingSystem.tsx`
- Modify: `packages/client/src/components/viewport/SceneView.tsx`

**Step 1: 理解 three.js 后处理 imports**

项目使用 `three@0.173.0`，后处理模块路径为：
- `three/examples/jsm/postprocessing/EffectComposer.js`
- `three/examples/jsm/postprocessing/RenderPass.js`
- `three/examples/jsm/postprocessing/UnrealBloomPass.js`
- `three/examples/jsm/postprocessing/FilmPass.js`
- `three/examples/jsm/postprocessing/BokehPass.js`
- `three/examples/jsm/postprocessing/SSAOPass.js`
- `three/examples/jsm/postprocessing/OutputPass.js`

**Step 2: 创建 `PostProcessingSystem.tsx`**

```typescript
// packages/client/src/features/postprocessing/PostProcessingSystem.tsx
import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { useSceneStore } from '@/stores/sceneStore';
import type {
  PostProcessEffect,
  UnrealBloomParams,
  FilmParams,
  BokehParams,
  SSAOParams,
} from '@/types';

export const PostProcessingSystem: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  const effects = useSceneStore((s) => s.scene.settings.postProcessing ?? []);
  const composerRef = useRef<EffectComposer | null>(null);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(scene, camera));

    const enabledEffects = effects.filter((e) => e.enabled);
    for (const effect of enabledEffects) {
      const pass = buildPass(effect, scene, camera, size);
      if (pass) composer.addPass(pass);
    }
    composer.addPass(new OutputPass());
    composer.setSize(size.width, size.height);

    composerRef.current = composer;
    return () => {
      composer.dispose();
    };
  }, [effects, gl, scene, camera, size]);

  // 负优先级确保在 R3F 默认渲染之前接管（实际 R3F v9 中 priority<0 跳过默认渲染）
  useFrame(() => {
    composerRef.current?.render();
  }, -Infinity);

  return null;
};

function buildPass(
  effect: PostProcessEffect,
  scene: THREE.Scene,
  camera: THREE.Camera,
  size: { width: number; height: number }
) {
  switch (effect.type) {
    case 'UnrealBloom': {
      const p = effect.params as UnrealBloomParams;
      return new UnrealBloomPass(
        new THREE.Vector2(size.width, size.height),
        p.strength,
        p.radius,
        p.threshold
      );
    }
    case 'Film': {
      const p = effect.params as FilmParams;
      return new FilmPass(p.intensity, p.grayscale);
    }
    case 'Bokeh': {
      const p = effect.params as BokehParams;
      return new BokehPass(scene, camera, {
        focus: p.focus,
        aperture: p.aperture,
        maxblur: p.maxblur,
      });
    }
    case 'SSAO': {
      const p = effect.params as SSAOParams;
      const pass = new SSAOPass(scene, camera, size.width, size.height);
      pass.radius = p.radius;
      pass.minDistance = p.minDistance;
      pass.maxDistance = p.maxDistance;
      return pass;
    }
    default:
      return null;
  }
}
```

**Step 3: 验证 TypeScript 编译**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -i "postprocessing" | head -20
```

Expected: 无 PostProcessingSystem 相关错误

**Step 4: 修改 `SceneView.tsx`，添加 `PostProcessingSystem`**

在 `SceneView.tsx` 中：
1. 顶部添加导入：
   ```typescript
   import { PostProcessingSystem } from '@/features/postprocessing/PostProcessingSystem';
   ```
2. 在 `<Suspense>` 内 `<SceneContent />` 之后添加：
   ```tsx
   <PostProcessingSystem />
   ```

**Step 5: 验证开发服务器启动无错误**

```bash
pnpm dev
```

打开 http://localhost:5173，确认场景正常渲染（无后处理效果时与之前等效）。

**Step 6: Commit**

```bash
git add packages/client/src/features/postprocessing/PostProcessingSystem.tsx \
        packages/client/src/components/viewport/SceneView.tsx
git commit -m "feat(viewport): add PostProcessingSystem with Three.js EffectComposer"
```

---

## Task 4: PostProcessingProp Inspector UI 组件

**Files:**
- Create: `packages/client/src/components/inspector/PostProcessingProp.tsx`

**Step 1: 了解现有 Inspector 组件的样式规范**

阅读 `packages/client/src/components/inspector/SceneProp.tsx`，了解：
- 分区容器样式：`div.p-4.space-y-5`
- 标题行：`material-symbols-outlined` 图标 + `h3.text-[11px].font-bold.text-slate-300`
- 卡片容器：`rounded.border.border-border-dark.bg-header-dark/30.p-3`
- 文本：`text-xs.text-slate-500`（label），`text-slate-300`（值）

参考 `@dnd-kit` 用法，查看项目中已有的拖拽实现（如层级面板）。

**Step 2: 创建 `PostProcessingProp.tsx`**

```typescript
// packages/client/src/components/inspector/PostProcessingProp.tsx
import React, { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSceneStore } from '@/stores/sceneStore';
import type { PostProcessEffect, PostProcessEffectType, PostProcessParams } from '@/types';
import { NumberInput } from '@/components/inspector/common/NumberInput';

// ── 效果显示名映射 ─────────────────────────────────────────────
const EFFECT_LABELS: Record<PostProcessEffectType, string> = {
  UnrealBloom: 'Unreal Bloom（辉光）',
  Film: 'Film（胶片颗粒）',
  Bokeh: 'Bokeh（景深）',
  SSAO: 'SSAO（环境光遮蔽）',
};

const ALL_EFFECT_TYPES: PostProcessEffectType[] = ['UnrealBloom', 'Film', 'Bokeh', 'SSAO'];

// ── 单个效果参数编辑 ────────────────────────────────────────────
interface EffectParamsEditorProps {
  effect: PostProcessEffect;
  onChange: (id: string, params: Partial<PostProcessParams>) => void;
}

const EffectParamsEditor: React.FC<EffectParamsEditorProps> = ({ effect, onChange }) => {
  const p = effect.params as any;
  const update = (key: string, value: unknown) =>
    onChange(effect.id, { [key]: value } as Partial<PostProcessParams>);

  switch (effect.type) {
    case 'UnrealBloom':
      return (
        <div className="space-y-2 mt-2">
          <ParamRow label="Threshold" value={p.threshold} min={0} max={1} step={0.01} onChange={(v) => update('threshold', v)} />
          <ParamRow label="Strength"  value={p.strength}  min={0} max={3} step={0.05} onChange={(v) => update('strength', v)} />
          <ParamRow label="Radius"    value={p.radius}    min={0} max={1} step={0.01} onChange={(v) => update('radius', v)} />
        </div>
      );
    case 'Film':
      return (
        <div className="space-y-2 mt-2">
          <ParamRow label="Intensity" value={p.intensity} min={0} max={1} step={0.01} onChange={(v) => update('intensity', v)} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500 text-[11px]">Grayscale</span>
            <input
              type="checkbox"
              checked={p.grayscale}
              onChange={(e) => update('grayscale', e.target.checked)}
              className="w-3.5 h-3.5 accent-primary cursor-pointer"
            />
          </div>
        </div>
      );
    case 'Bokeh':
      return (
        <div className="space-y-2 mt-2">
          <ParamRow label="Focus"   value={p.focus}   min={0}    max={10}  step={0.1}    onChange={(v) => update('focus', v)} />
          <ParamRow label="Aperture" value={p.aperture} min={0}  max={0.1} step={0.001}  onChange={(v) => update('aperture', v)} />
          <ParamRow label="Max Blur" value={p.maxblur} min={0}   max={0.05} step={0.001} onChange={(v) => update('maxblur', v)} />
        </div>
      );
    case 'SSAO':
      return (
        <div className="space-y-2 mt-2">
          <ParamRow label="Radius"      value={p.radius}      min={0}    max={32}  step={0.5}     onChange={(v) => update('radius', v)} />
          <ParamRow label="Min Distance" value={p.minDistance} min={0}   max={0.01} step={0.0001} onChange={(v) => update('minDistance', v)} />
          <ParamRow label="Max Distance" value={p.maxDistance} min={0}   max={1}   step={0.01}    onChange={(v) => update('maxDistance', v)} />
        </div>
      );
    default:
      return null;
  }
};

// ── 通用参数行（label + slider + 数字输入）─────────────────────
interface ParamRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

const ParamRow: React.FC<ParamRowProps> = ({ label, value, min, max, step, onChange }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-slate-500 text-[11px] shrink-0 w-20">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1 accent-primary h-1"
    />
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!isNaN(v)) onChange(v);
      }}
      className="w-14 bg-[#0c0e14] border border-border-dark text-white text-[11px] px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 text-right font-mono"
    />
  </div>
);

// ── 可排序效果卡片 ─────────────────────────────────────────────
interface SortableEffectCardProps {
  effect: PostProcessEffect;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onParamsChange: (id: string, params: Partial<PostProcessParams>) => void;
}

const SortableEffectCard: React.FC<SortableEffectCardProps> = ({
  effect, onToggle, onRemove, onParamsChange,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: effect.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded border border-border-dark bg-header-dark/30 overflow-hidden"
    >
      {/* 卡片头部 */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* 拖拽手柄 */}
        <button
          {...attributes}
          {...listeners}
          className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
          title="拖拽排序"
        >
          <span className="material-symbols-outlined text-sm">drag_indicator</span>
        </button>

        {/* 启用 checkbox */}
        <input
          type="checkbox"
          checked={effect.enabled}
          onChange={() => onToggle(effect.id)}
          className="w-3.5 h-3.5 accent-primary cursor-pointer shrink-0"
        />

        {/* 效果名称 */}
        <span className={`text-[11px] flex-1 font-medium ${effect.enabled ? 'text-slate-300' : 'text-slate-600'}`}>
          {EFFECT_LABELS[effect.type]}
        </span>

        {/* 删除按钮 */}
        <button
          onClick={() => onRemove(effect.id)}
          className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
          title="删除效果"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {/* 参数编辑（仅启用时展示完整参数，禁用时折叠） */}
      {effect.enabled && (
        <div className="px-3 pb-3 border-t border-border-dark/50">
          <EffectParamsEditor effect={effect} onChange={onParamsChange} />
        </div>
      )}
    </div>
  );
};

// ── 主组件 ─────────────────────────────────────────────────────
export const PostProcessingProp: React.FC = () => {
  const effects = useSceneStore((s) => s.scene.settings.postProcessing ?? []);
  const addEffect      = useSceneStore((s) => s.addPostProcessEffect);
  const removeEffect   = useSceneStore((s) => s.removePostProcessEffect);
  const toggleEffect   = useSceneStore((s) => s.togglePostProcessEffect);
  const updateEffect   = useSceneStore((s) => s.updatePostProcessEffect);
  const reorderEffects = useSceneStore((s) => s.reorderPostProcessEffects);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = effects.findIndex((e) => e.id === active.id);
        const newIndex = effects.findIndex((e) => e.id === over.id);
        reorderEffects(arrayMove(effects, oldIndex, newIndex));
      }
    },
    [effects, reorderEffects]
  );

  return (
    <div>
      {/* 分区标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-xs text-primary">auto_fix_high</span>
        <h3 className="text-[11px] font-bold text-slate-300">后处理效果 (Post-Processing)</h3>
      </div>

      {/* 添加按钮 */}
      <div className="mb-3">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              addEffect(e.target.value as PostProcessEffectType);
              e.target.value = '';
            }
          }}
          className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-slate-400 text-[11px] focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">+ 添加后处理效果...</option>
          {ALL_EFFECT_TYPES.map((type) => (
            <option key={type} value={type}>{EFFECT_LABELS[type]}</option>
          ))}
        </select>
      </div>

      {/* 效果列表 */}
      {effects.length === 0 ? (
        <p className="text-slate-600 text-[10px] text-center py-2">
          暂无后处理效果，从上方下拉菜单添加。
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={effects.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {effects.map((effect) => (
                <SortableEffectCard
                  key={effect.id}
                  effect={effect}
                  onToggle={toggleEffect}
                  onRemove={removeEffect}
                  onParamsChange={updateEffect}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
```

**Step 3: 验证 TypeScript**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -i "PostProcessingProp\|postprocessing" | head -20
```

Expected: 无新增错误

**Step 4: Commit**

```bash
git add packages/client/src/components/inspector/PostProcessingProp.tsx
git commit -m "feat(inspector): add PostProcessingProp component with dnd-kit sorting"
```

---

## Task 5: 集成到 SceneProp

**Files:**
- Modify: `packages/client/src/components/inspector/SceneProp.tsx`

**Step 1: 打开 `SceneProp.tsx`**

阅读整个文件，找到最后一个分区（`阴影类型` 分区，`</div>` 结束处），以及外层容器 `<div className="p-4 space-y-5">`。

**Step 2: 添加导入并在末尾插入新分区**

在 `SceneProp.tsx` 顶部添加导入：
```typescript
import { PostProcessingProp } from '@/components/inspector/PostProcessingProp';
```

在最外层 `<div className="p-4 space-y-5">` 末尾（阴影分区的 `</div>` 之后，最外层 `</div>` 之前）添加：

```tsx
{/* 后处理效果 */}
<div>
  <PostProcessingProp />
</div>
```

**Step 3: 启动开发服务器验证 UI**

```bash
pnpm dev
```

1. 打开编辑器，在 Hierarchy 面板中点击"场景"根节点
2. Inspector 应出现"后处理效果 (Post-Processing)"分区
3. 点击下拉菜单添加 UnrealBloom 效果
4. 确认效果卡片出现，可调节参数
5. 在 SceneView 中确认辉光效果实时变化

**Step 4: Commit**

```bash
git add packages/client/src/components/inspector/SceneProp.tsx
git commit -m "feat(inspector): integrate PostProcessingProp into SceneProp"
```

---

## Task 6: 兼容旧场景数据（normalizeSceneSettings）

**Files:**
- Modify: `packages/client/src/types/index.ts`（`normalizeSceneSettings` 函数）

**Step 1: 找到 `normalizeSceneSettings` 函数**

该函数在 `types/index.ts` 中，负责处理从 API 加载的旧场景数据。

**Step 2: 确认函数正确处理 `postProcessing` 字段**

现有函数使用 `[key: string]: any` 扩展，旧数据中 `postProcessing` 为 `undefined` 时会被保留为 `undefined`，`PostProcessingSystem` 中 `?? []` 已处理空值，所以此步骤可能无需修改。

验证：阅读函数实现，确认 `settings.postProcessing` 未被覆盖或丢失。如果函数中有明确的字段白名单，则需要添加 `postProcessing: settings.postProcessing ?? []`。

**Step 3: 验证类型检查**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | head -30
```

**Step 4: Commit（如有修改）**

```bash
git add packages/client/src/types/index.ts
git commit -m "fix(types): ensure normalizeSceneSettings preserves postProcessing field"
```

---

## Task 7: 端到端功能验证

**Step 1: 完整功能测试**

启动开发服务器和后端：
```bash
pnpm dev:all
```

验证以下场景（在浏览器中手动测试）：

| 测试场景 | 预期结果 |
|---------|---------|
| 打开场景，Inspector 场景属性 → 看到后处理分区 | 显示"+ 添加后处理效果..."下拉 |
| 添加 UnrealBloom → 调大 Strength 到 2.0 | SceneView 出现明显辉光 |
| 添加 Film → 看到颗粒效果 | SceneView 出现胶片颗粒 |
| 添加 SSAO → 调大 Radius | 场景角落出现环境光遮蔽暗化 |
| 禁用某效果（取消 checkbox）| 效果从 SceneView 消失，参数区折叠 |
| 拖拽调整效果顺序 | 渲染顺序跟随列表顺序改变 |
| 删除效果 | 效果从列表和渲染中移除 |
| 刷新页面 | 后处理设置从数据库恢复 |

**Step 2: 检查控制台无错误**

```
Chrome DevTools Console → 确认无 THREE.js 相关错误
```

**Step 3: 最终 Commit**

```bash
git status
git commit -m "feat(postprocessing): complete post-processing system with UnrealBloom/Film/Bokeh/SSAO"
```

---

## 关键注意事项

1. **BokehPass 的 scene/camera 引用**: 必须在 Canvas 内部通过 `useThree()` 获取，`PostProcessingSystem` 已处于 Canvas 内部，符合要求。

2. **useFrame 优先级**: R3F v9 中，`useFrame(fn, priority)` 的 `priority` 越大越晚执行。设为 `-Infinity` 或大负数可确保在默认渲染循环之前运行，实际行为需测试验证。如果画面出现两次渲染（闪烁），需要在 `useEffect` 中设置 `gl.autoClear = false`。

3. **EffectComposer 重建 vs 参数更新**: 当前设计是效果参数变化时完整重建 composer。这对实时调参有轻微延迟，但实现最简单。如性能有问题，可优化为只更新 pass 参数而不重建（但需要维护 pass 引用，复杂度更高）。

4. **SSAOPass 参数**: `SSAOPass` 构造函数接受 `width/height`，而非从 `EffectComposer` 自动推断，需传入 `size.width` 和 `size.height`。

5. **dnd-kit KeyboardSensor**: `sortableKeyboardCoordinates` 已导入但上述代码只用了 `PointerSensor`，如果不需要键盘支持可省略导入。
