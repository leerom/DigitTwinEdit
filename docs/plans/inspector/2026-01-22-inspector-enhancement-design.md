# 属性检视器 (Inspector) 重构与增强设计

## 1. 概述 (Overview)

当前属性检视器功能较为单一，不支持对象特定属性编辑，且不支持多选编辑。本设计旨在重构 `InspectorPanel`，使其支持组件化渲染（针对不同对象类型显示不同属性）、角度制旋转显示以及多对象批量编辑功能。

**目标**:
1.  **类型感知**: 根据选中对象的类型（相机、灯光、模型等）动态加载并显示对应的属性面板。
2.  **人性化显示**: 旋转属性从“弧度”改为“角度”显示。
3.  **多选支持**: 当选中多个对象时，支持批量编辑公共属性；若类型一致，支持批量编辑特定属性。

## 2. 架构设计 (Architecture)

采用 **组件化 (Component-Based)** 架构。主面板负责分析选中对象的类型一致性，然后分发给具体的属性子组件。

### 2.1 组件结构
```
src/components/inspector/
├── InspectorPanel.tsx       # 主入口，负责多选逻辑判断与分发
├── common/
│   ├── TransformProp.tsx    # 通用变换属性 (位置/旋转/缩放)，支持多选
│   ├── NameProp.tsx         # 名称编辑 (多选时可能禁用或支持批量重命名)
│   └── ActiveProp.tsx       # 激活/可见性切换
├── specific/
│   ├── CameraProp.tsx       # 相机特定属性 (FOV, Near, Far)
│   ├── LightProp.tsx        # 灯光特定属性 (Color, Intensity)
│   └── MeshProp.tsx         # 模型特定属性 (Shadows, Material引用)
└── utils/
    └── inspectorUtils.ts    # 辅助函数：值的一致性检查、单位转换
```

### 2.2 数据流 (Data Flow)
所有属性组件不再接收单一 `id`，而是接收对象 ID 数组 `ids: string[]`。

*   **读取 (Read)**: 组件读取所有 ID 对应的属性值。
    *   若所有值相等 -> 显示该值。
    *   若值不相等 -> 显示 `---` 或 `Mixed` 占位符。
*   **写入 (Write)**: `onChange` 事件触发时，遍历所有 ID 并调用 `useSceneStore` 的更新方法进行批量更新。

## 3. 详细设计 (Detailed Design)

### 3.1 旋转单位转换 (Radians <-> Degrees)
底层数据 (`SceneStore`) 保持使用 **弧度 (Radians)**。
UI 层 (`TransformProp`) 负责实时转换：
*   **Display**: `degrees = radians * (180 / Math.PI)`
*   **Update**: `radians = degrees * (Math.PI / 180)`

### 3.2 多选逻辑策略
在 `InspectorPanel` 中：

1.  获取 `selectedIds`。
2.  若为空 -> 显示 "No Selection"。
3.  若不为空 ->
    *   始终渲染 `TransformProp` (传入 `selectedIds`)。
    *   检查所有选中对象的 `type` 是否一致。
        *   **一致 (e.g. 都是 Light)** -> 渲染对应的 `LightProp` (传入 `selectedIds`)。
        *   **不一致 (e.g. Light + Camera)** -> 仅显示通用属性，隐藏特定属性面板。

### 3.3 属性组件接口
```typescript
interface InspectorPropProps {
  objectIds: string[];
}
```

## 4. 实施步骤 (Implementation Steps)

### 阶段 1: 基础重构与变换组件
1.  创建 `inspectorUtils.ts`，实现多值检查 (`getCommonValue`) 和角度转换工具。
2.  重构 `TransformProp.tsx`，使其支持 `objectIds` 数组输入，并实现弧度转角度。
3.  修改 `InspectorPanel.tsx` 以支持多选 ID 传递。

### 阶段 2: 类型特定组件
4.  创建 `CameraProp.tsx`: 支持编辑 FOV, Near, Far。
5.  创建 `LightProp.tsx`: 支持编辑 Color, Intensity, Distance。
6.  在 `InspectorPanel.tsx` 中添加类型判断与动态渲染逻辑。

## 5. 验证标准 (Verification)
*   [ ] 选中单个物体，旋转值显示为角度（如 90 而不是 1.57）。
*   [ ] 选中单个相机，能看到并修改 FOV。
*   [ ] 选中单个灯光，能看到并修改强度。
*   [ ] **多选测试**:
    *   选中两个位置不同的物体，位置输入框显示混合状态（如 `---`）。
    *   输入新位置，两个物体同时移动到新位置。
    *   选中一个相机和一个灯光，面板只显示变换属性，不显示相机/灯光特有属性。
