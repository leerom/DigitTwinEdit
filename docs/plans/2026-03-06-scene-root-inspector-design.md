# 设计文档：点击层级视图场景根目录展示场景配置

**日期**：2026-03-06
**状态**：已审批（方案 A）

---

## 需求概述

用户点击层级视图（HierarchyPanel）中的场景根目录行时，右侧属性检视器（InspectorPanel）应切换为展示场景级配置，包括：

- 场景环境贴图（已有 SceneEnvironmentProp）
- 背景颜色（backgroundColor）
- 阴影类型（shadowMapType）

---

## 方案选择：方案 A（editorStore 新增 sceneRootSelected 标志）

在 `editorStore` 增加 `sceneRootSelected: boolean` 标志。点击根目录行置为 `true`，调用 `select()` 或 `clearSelection()` 时自动置为 `false`。语义明确，视口空白点击不会误高亮根目录行。

---

## 涉及文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `packages/client/src/types/index.ts` | 修改 | `SceneSettings` 新增 `shadowMapType?` |
| `packages/client/src/stores/sceneStore.ts` | 修改 | 新增 `updateSceneSettings(patch)` action |
| `packages/client/src/stores/editorStore.ts` | 修改 | 新增 `sceneRootSelected` + `selectSceneRoot()`，修改 `select()`/`clearSelection()` |
| `packages/client/src/components/panels/HierarchyPanel.tsx` | 修改 | 根目录行可点击，点击时调用 `selectSceneRoot()` 并高亮 |
| `packages/client/src/components/panels/InspectorPanel.tsx` | 修改 | `sceneRootSelected` 时展示带标题头部的场景检视器 |
| `packages/client/src/components/inspector/SceneProp.tsx` | 新建 | 场景属性组件（环境 + 背景色 + 阴影类型） |
| `packages/client/src/features/scene/hooks/useSceneConfig.ts` | 修改 | 同步 `shadowMapType` 到 `gl.shadowMap.type` |

---

## 数据流设计

### editorStore 变更

```ts
// 新增状态
sceneRootSelected: boolean  // 默认 false

// 新增 action
selectSceneRoot(): void
// 实现：set({ selectedIds: [], activeId: null, activeSubNodePath: null, sceneRootSelected: true })

// 修改 select()
// 在现有逻辑末尾追加 sceneRootSelected: false

// 修改 clearSelection()
// 追加 sceneRootSelected: false
```

### sceneStore 变更

```ts
// 新增 action
updateSceneSettings(patch: Partial<SceneSettings>): void
// 实现：immer 直接 Object.assign + isDirty=true + updatedAt
```

### types 变更

```ts
export interface SceneSettings {
  environment: SceneEnvironmentSettings;
  gridVisible: boolean;
  backgroundColor: string;
  shadowMapType?: 'PCFSoftShadowMap' | 'PCFShadowMap' | 'VSMShadowMap';  // 新增
  [key: string]: any;
}
```

---

## UI 设计

### HierarchyPanel 根目录行

- 变为可点击的 `<div onClick={handleSceneRootClick}>`
- 点击时调用 `selectSceneRoot()` + `selectAsset(null)` + `selectMaterial(null)`
- `sceneRootSelected === true` 时应用 `bg-primary/20 text-white border-l-2 border-primary`（与普通对象选中一致）

### InspectorPanel 场景检视器布局

```
┌─────────────────────────────────────┐
│ 属性检视器 (Inspector)         ⚙️   │
├─────────────────────────────────────┤
│  [deployed_code icon]  [场景名称]   │  ← 场景标题头部
├─────────────────────────────────────┤
│  SceneProp 组件内容：              │
│  • 环境贴图区块（复用已有逻辑）     │
│  • 背景颜色区块（颜色选择器）       │
│  • 阴影类型区块（下拉选择器）       │
└─────────────────────────────────────┘
```

**显示逻辑**：
- `sceneRootSelected === true` → 展示含标题头部的完整场景检视器
- `sceneRootSelected === false && !activeId && !selectedAsset && !selectedMaterial` → 沿用现有 fallback（仅显示 SceneEnvironmentProp，无标题）

### SceneProp 组件（新建）

三个配置区块，样式与现有 Inspector 属性区块保持一致：

1. **环境区块**：读取 `scene.settings.environment`，调用 `setDefaultEnvironment` / `setEnvironmentAsset`
2. **背景颜色**：`<input type="color">` + hex 文本输入，`onChange` 调用 `updateSceneSettings({ backgroundColor })`
3. **阴影类型**：`<select>` 下拉，选项 PCFSoftShadowMap / PCFShadowMap / VSMShadowMap，`onChange` 调用 `updateSceneSettings({ shadowMapType })`

---

## 阴影类型生效机制

`useSceneConfig.ts` 中追加（在 Canvas 内执行）：

```ts
const { gl } = useThree();

useEffect(() => {
  const typeMap = {
    PCFShadowMap: THREE.PCFShadowMap,
    PCFSoftShadowMap: THREE.PCFSoftShadowMap,
    VSMShadowMap: THREE.VSMShadowMap,
  };
  gl.shadowMap.type = typeMap[scene.settings.shadowMapType ?? 'PCFSoftShadowMap'];
  gl.shadowMap.needsUpdate = true;
}, [scene.settings.shadowMapType, gl]);
```

---

## 测试要点

1. 点击层级视图场景根目录行 → 根目录行蓝色高亮，Inspector 显示场景配置
2. 再点击任意对象 → 根目录行高亮消失，Inspector 切回对象属性
3. 修改背景颜色 → Scene View 背景立即变化，场景标脏（isDirty=true）
4. 修改阴影类型 → Three.js `shadowMap.type` 更新
5. 视口点击空白处（clearSelection）→ 根目录行不高亮
6. 切换到资产/材质检视模式 → 根目录行不高亮
