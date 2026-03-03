# 属性检视器 (Inspector) 增强实现计划

> **给 Claude 的提示:** 必需的子技能：使用 `superpowers:executing-plans` 来逐步执行此计划。

**目标:** 重构属性检视器面板，以支持特定对象类型的属性、基于角度的旋转显示以及多选编辑功能。

**架构:** 基于组件的架构。主 `InspectorPanel` 处理选择逻辑，并根据选择渲染通用组件（`TransformProp`、`NameProp`）和特定组件（`CameraProp`、`LightProp`）。

**技术栈:** React, Zustand, TailwindCSS

---

### 任务 1: 基础 - Inspector 工具函数 & TransformProp

**文件:**
- 创建: `src/components/inspector/utils/inspectorUtils.ts`
- 修改: `src/components/inspector/TransformProp.tsx`
- 修改: `src/components/panels/InspectorPanel.tsx`

**步骤 1: 创建 inspectorUtils.ts**

创建用于处理多值和单位转换的工具函数。

```typescript
// src/components/inspector/utils/inspectorUtils.ts

export const MIXED_VALUE = '---';

export function getCommonValue<T>(values: T[]): T | typeof MIXED_VALUE {
  if (values.length === 0) return MIXED_VALUE;
  const first = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== first) return MIXED_VALUE;
  }
  return first;
}

export const radToDeg = (rad: number) => Math.round(rad * (180 / Math.PI) * 100) / 100;
export const degToRad = (deg: number) => deg * (Math.PI / 180);
```

**步骤 2: 重构 TransformProp.tsx 以支持多选 & 角度**

更新 `TransformProp` 以接受 `objectIds: string[]` 而不是 `objectId: string`。
实现读取所有变换、计算公共值（将旋转转换为角度）和批量更新的逻辑。

**步骤 3: 更新 InspectorPanel.tsx 以传递数组**

更新 `InspectorPanel` 以从 store 获取 `selectedIds`，并将 `activeId`（作为单项数组）或 `selectedIds` 传递给 `TransformProp`。
*注意：目前如果是单选，我们只传递 `[activeId]` 以保持正常工作，或者如果想立即启用多选编辑，则传递完整的 `selectedIds`。*

**步骤 4: 提交**
```bash
git add src/components/inspector/utils/inspectorUtils.ts src/components/inspector/TransformProp.tsx src/components/panels/InspectorPanel.tsx
git commit -m "feat(inspector): add utils and refactor transform prop for multi-select and degrees"
```

---

### 任务 2: 类型特定组件 - 相机 (Camera)

**文件:**
- 创建: `src/components/inspector/specific/CameraProp.tsx`
- 修改: `src/components/panels/InspectorPanel.tsx`

**步骤 1: 创建 CameraProp.tsx**

实现一个接受 `objectIds: string[]` 的组件。
- 过滤对象以确保它们是相机。
- 渲染 `fov`、`near`、`far` 的输入框（检查混合值）。
- 更改时更新 store 中的 `camera` 组件数据。

**步骤 2: 集成到 InspectorPanel**

- 在 `InspectorPanel` 中，检查所有选中的对象是否都是 `CAMERA` 类型。
- 如果是，渲染 `<CameraProp objectIds={selectedIds} />`。

**步骤 3: 提交**
```bash
git add src/components/inspector/specific/CameraProp.tsx src/components/panels/InspectorPanel.tsx
git commit -m "feat(inspector): add camera property editor"
```

---

### 任务 3: 类型特定组件 - 灯光 (Light)

**文件:**
- 创建: `src/components/inspector/specific/LightProp.tsx`
- 修改: `src/components/panels/InspectorPanel.tsx`

**步骤 1: 创建 LightProp.tsx**

为 `objectIds` 实现 `LightProp`。
- 渲染 `color`、`intensity`、`distance`、`decay` 的输入框（取决于灯光类型）。
- 支持批量更新。

**步骤 2: 集成到 InspectorPanel**

- 检查所有选中的对象是否都是 `LIGHT`。
- 渲染 `<LightProp objectIds={selectedIds} />`。

**步骤 3: 提交**
```bash
git add src/components/inspector/specific/LightProp.tsx src/components/panels/InspectorPanel.tsx
git commit -m "feat(inspector): add light property editor"
```

---

### 任务 4: 清理与完善

**文件:**
- 修改: `src/components/panels/InspectorPanel.tsx`

**步骤 1: 改进选择 UI**

- 如果 `selectedIds.length > 1`，在标题中显示“多对象已选”而不是单个名称。
- 确保像 `TwinDataProp` 或 `MaterialProp` 这样的通用组件要么被隐藏，要么更新以支持多选（或者目前先禁用）。

**步骤 2: 提交**
```bash
git add src/components/panels/InspectorPanel.tsx
git commit -m "refactor(inspector): polish multi-selection ui"
```
