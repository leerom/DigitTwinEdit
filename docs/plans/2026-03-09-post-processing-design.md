# 后处理功能设计文档

**日期**: 2026-03-09
**功能**: Three.js 后处理效果管理与应用
**实现方案**: 方案 A — Three.js 原生 EffectComposer

---

## 概述

为三维编辑器场景渲染增加后处理功能，支持用户在"属性检视器"的场景属性面板中管理后处理效果（增删改排序、启用/禁用），并实时同步到 SceneView 渲染。

首期支持四种效果：**UnrealBloom**（辉光）、**Film**（胶片颗粒）、**Bokeh**（景深）、**SSAO**（环境光遮蔽）。

---

## 一、数据模型

### 1.1 新增类型（`packages/client/src/types/index.ts`）

```typescript
// 后处理效果类型
export type PostProcessEffectType = 'UnrealBloom' | 'Film' | 'Bokeh' | 'SSAO';

// 各效果参数接口
export interface UnrealBloomParams {
  threshold: number;   // 亮度阈值，默认 0.85，范围 [0, 1]
  strength: number;    // 辉光强度，默认 1.5，范围 [0, 3]
  radius: number;      // 辉光半径，默认 0.4，范围 [0, 1]
}

export interface FilmParams {
  intensity: number;   // 颗粒强度，默认 0.35，范围 [0, 1]
  grayscale: boolean;  // 是否转为灰度，默认 false
}

export interface BokehParams {
  focus: number;       // 焦距，默认 1.0，范围 [0, 10]
  aperture: number;    // 光圈（越大景深越浅），默认 0.025，范围 [0, 0.1]
  maxblur: number;     // 最大模糊量，默认 0.01，范围 [0, 0.05]
}

export interface SSAOParams {
  radius: number;      // 采样半径，默认 4，范围 [0, 32]
  minDistance: number; // 最小距离，默认 0.001，范围 [0, 0.01]
  maxDistance: number; // 最大距离，默认 0.1，范围 [0, 1]
}

export type PostProcessParams = UnrealBloomParams | FilmParams | BokehParams | SSAOParams;

// 单个后处理效果条目
export interface PostProcessEffect {
  id: string;                    // uuid，用于 React key 和 dnd-kit
  type: PostProcessEffectType;
  enabled: boolean;
  params: PostProcessParams;
}
```

### 1.2 SceneSettings 扩展

```typescript
export interface SceneSettings {
  environment: SceneEnvironmentSettings;
  gridVisible: boolean;
  backgroundColor: string;
  shadowMapType?: 'PCFSoftShadowMap' | 'PCFShadowMap' | 'VSMShadowMap';
  postProcessing?: PostProcessEffect[];  // 新增，有序列表
  [key: string]: any;
}
```

### 1.3 各效果默认参数常量

新建 `packages/client/src/features/postprocessing/defaultParams.ts`：

```typescript
export const POST_PROCESS_DEFAULTS: Record<PostProcessEffectType, PostProcessParams> = {
  UnrealBloom: { threshold: 0.85, strength: 1.5, radius: 0.4 },
  Film:        { intensity: 0.35, grayscale: false },
  Bokeh:       { focus: 1.0, aperture: 0.025, maxblur: 0.01 },
  SSAO:        { radius: 4, minDistance: 0.001, maxDistance: 0.1 },
};
```

---

## 二、Store 层

### 2.1 新增 Actions（`packages/client/src/stores/sceneStore.ts`）

```typescript
// 添加效果（带默认参数）
addPostProcessEffect: (type: PostProcessEffectType) => void;

// 删除效果
removePostProcessEffect: (id: string) => void;

// 切换启用/禁用
togglePostProcessEffect: (id: string) => void;

// 修改效果参数
updatePostProcessEffect: (id: string, params: Partial<PostProcessParams>) => void;

// 重新排序（dnd-kit arrayMove 结果）
reorderPostProcessEffects: (newOrder: PostProcessEffect[]) => void;
```

所有 actions 均通过 immer 修改 state，设置 `isDirty = true`，触发自动保存。

---

## 三、SceneView 渲染层

### 3.1 新建组件

**文件**：`packages/client/src/features/postprocessing/PostProcessingSystem.tsx`

该组件放置在 `SceneView.tsx` 的 `<Canvas>` 内部（`<SceneContent />` 之后，`</Suspense>` 之前）。

**职责**：
- 读取 `sceneStore.scene.settings.postProcessing`（已启用的有序效果列表）
- 当 effects 列表、canvas 尺寸发生变化时，重建 `EffectComposer`（dispose 旧的）
- 使用 `useFrame`（priority 设为负值，如 `-1`）接管 R3F 渲染循环

**渲染管线**：
```
EffectComposer:
  RenderPass(scene, camera)          ← 基础场景渲染
  [enabled effects in order...]      ← 动态 passes
  OutputPass()                       ← 颜色空间转换输出
```

**React 渲染循环接管方式**：
- 使用 `useFrame((_, delta) => composer.render(delta), -Infinity)` 确保在 R3F 默认渲染前接管
- 同时需在 Canvas 上设置 `frameloop="always"`（SceneView 已满足）
- 禁用 R3F 自动渲染：通过 `useThree(state => state.gl)` 获取 renderer，在 `useEffect` 中设置 `gl.autoClear = false`（EffectComposer 自己管理清除）

**当 postProcessing 为空/无效果时的行为**：
- 仍然创建 composer（仅含 RenderPass + OutputPass）
- 渲染结果与不使用后处理等效，不影响性能（overhead 极小）

### 3.2 各效果 Pass 参数映射

| 效果 | Three.js Pass | 关键参数传递 |
|------|--------------|------------|
| UnrealBloom | `UnrealBloomPass(size, strength, radius, threshold)` | 构造函数参数 |
| Film | `FilmPass(intensity, grayscale)` | 构造函数参数 |
| Bokeh | `BokehPass(scene, camera, { focus, aperture, maxblur })` | 构造函数 options |
| SSAO | `SSAOPass(scene, camera, width, height)` + 属性赋值 | 构造后赋值 `pass.radius/minDistance/maxDistance` |

---

## 四、Inspector UI

### 4.1 新建组件

**文件**：`packages/client/src/components/inspector/PostProcessingProp.tsx`

使用 `@dnd-kit/sortable` 实现效果列表拖拽排序（项目已安装）。

**UI 结构**：

```
┌─ 后处理效果 (Post-Processing) ─────────────────────────────┐
│  [+ 添加效果 ▼]  ← 下拉菜单（select 元素）                   │
│                                                              │
│  [DndContext]                                                │
│  [SortableContext]                                           │
│  ┌── ☑ UnrealBloom ────────────────── [⣿拖拽] [✕删除] ──┐  │
│  │  threshold: ◄──────○────────►  0.85                   │  │
│  │  strength:  ◄──────────○────►  1.50                   │  │
│  │  radius:    ◄────○──────────►  0.40                   │  │
│  └────────────────────────────────────────────────────────┘ │
│  ┌── ☑ Film ─────────────────────── [⣿拖拽] [✕删除] ────┐  │
│  │  intensity: ◄──────○────────►  0.35                   │  │
│  │  grayscale: [□ 关]                                     │  │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**每个效果卡片（SortableEffectCard）**：
- 顶部行：启用 checkbox + 效果类型名 + 拖拽手柄（drag handle，material icon `drag_indicator`）+ 删除按钮
- 参数区域：数字输入框 + range slider 联动（复用 `<NumberInput>`），布尔值用 checkbox

**参数渲染**：按 `effect.type` 分支渲染对应参数表单，调用 `updatePostProcessEffect(id, { key: value })`

### 4.2 集成到 SceneProp

在 `SceneProp.tsx` 的 `<div className="p-4 space-y-5">` 末尾，阴影分区之后，导入并渲染 `<PostProcessingProp />`。

---

## 五、数据流总览

```
用户操作（Inspector）
    ↓
PostProcessingProp 调用 store action
    ↓
sceneStore.settings.postProcessing 更新（immer，isDirty=true）
    ↓
PostProcessingSystem（Canvas 内）订阅变化
    ↓
useEffect 重建 EffectComposer（dispose 旧的）
    ↓
useFrame 用新 composer 渲染 → SceneView 实时更新
    ↓
useAutoSave 1 秒防抖后 → API 保存到 PostgreSQL
```

---

## 六、文件变更清单

| 操作 | 文件 |
|------|------|
| 修改 | `packages/client/src/types/index.ts` — 新增类型 |
| 修改 | `packages/client/src/stores/sceneStore.ts` — 新增 actions |
| 新建 | `packages/client/src/features/postprocessing/defaultParams.ts` |
| 新建 | `packages/client/src/features/postprocessing/PostProcessingSystem.tsx` |
| 新建 | `packages/client/src/components/inspector/PostProcessingProp.tsx` |
| 修改 | `packages/client/src/components/inspector/SceneProp.tsx` — 引入新分区 |
| 修改 | `packages/client/src/components/viewport/SceneView.tsx` — 添加 PostProcessingSystem |

---

## 七、边界情况与注意事项

1. **场景加载时兼容旧数据**：`normalizeSceneSettings` 需处理无 `postProcessing` 字段的旧场景（视为空数组）
2. **BokehPass 需要 scene/camera 引用**：需通过 `useThree()` 在 Canvas 内部获取，不能在 Canvas 外创建
3. **SSAO 需要深度缓冲区**：`EffectComposer` 的 render target 需包含 `depthTexture`
4. **效果禁用时跳过 pass**：遍历 effects 时跳过 `enabled=false` 的效果（而非添加后再禁用）
5. **composer dispose**：每次 useEffect cleanup 时调用 `composer.dispose()` 防止内存泄漏
6. **R3F 渲染控制**：使用 `useFrame` 的负优先级接管渲染，确保不与 R3F 默认渲染冲突
