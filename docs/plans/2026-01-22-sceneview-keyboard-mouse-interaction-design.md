# SceneView 键盘鼠标交互系统设计文档

## 概述

本文档描述为数字孪生三维场景编辑器的 SceneView 组件增加完整的键盘鼠标交互操作系统的设计方案。

**目标**: 实现符合需求文档描述的完整键盘鼠标交互功能,包括工具切换、视图导航、对象编辑和选择增强。

**核心理念**: 采用**统一相机系统(CameraSystem)**与**全局输入状态(InputState)**相结合的架构，确保操作流畅且互不干扰。

---

## 第一部分: 架构设计

### 核心组件结构

采用分层架构，将相机控制、工具交互和输入管理清晰分离：

```
SceneView
├─ Canvas (R3F)
│  ├─ CameraSystem                 // [核心] 统一相机管理系统
│  │  ├─ OrbitController           // 轨道控制器 (默认模式)
│  │  └─ FlyController             // 飞行控制器 (WASD模式)
│  │
│  ├─ InteractionLayer             // 交互层
│  │  ├─ BoxSelector               // 框选
│  │  └─ SelectionLogic            // 点击选择逻辑
│  │
│  ├─ ToolSystem                   // 工具层
│  │  └─ ActiveToolGizmo           // 当前工具Gizmo (移动/旋转/缩放)
│  │
│  └─ SceneContent                 // 场景内容
│
├─ KeyboardShortcutManager         // [核心] 全局键盘事件监听 (DOM层)
└─ ViewportOverlay                 // UI覆盖层
```

### 状态管理设计

1. **EditorStore (Zustand)**: 存储宏观状态
   - `navigationMode`: 'orbit' | 'fly'
   - `activeTool`: 'hand' | 'translate' | 'rotate' | 'scale'
   - `selectedIds`: string[]

2. **InputState (新增, Zustand/Ref)**: 存储高频输入状态
   - `keys`: { [key: string]: boolean } (例如: { KeyW: true, ShiftLeft: false })
   - 用于 `FlyController` 在 `useFrame` 中平滑读取按键状态

---

## 第二部分: 详细子系统设计

### 1. 相机系统 (CameraSystem)

**职责**: 统一管理场景主相机，根据 `navigationMode` 切换控制策略。

**实现方案**:
- 维护一个共享的 `cameraRef`，确保切换模式时相机位置不跳变。
- **OrbitController**: 封装 `OrbitControls`，处理 Alt+左键旋转、中键平移、滚轮缩放。
- **FlyController**: 自定义实现，仅在 `navigationMode === 'fly'` 时激活。
  - 使用 `useFrame` 循环。
  - 读取 `InputState.keys` 计算移动向量。
  - 读取 `PointerLock` 的鼠标移动计算视角旋转。

### 2. 键盘快捷键管理器 (KeyboardShortcutManager)

**职责**: 全局监听 `keydown`/`keyup`，解决按键冲突。

**冲突解决策略**:
- **模式优先**:
  - 当 `navigationMode === 'fly'` (右键按住) 时，W/A/S/D 被视为移动指令，**不触发**工具切换。
  - 当 `navigationMode === 'orbit'` (默认) 时，W/A/S/D 触发 `setTool(...)`。

**数据流**:
1. 用户按下 'W'。
2. `KeyboardShortcutManager` 捕获事件。
3. 检查 Store 中的 `navigationMode`。
4. 分发:
   - 若是 Fly 模式 -> 更新 `InputState.keys['KeyW'] = true`。
   - 若是 Orbit 模式 -> 调用 `editorStore.setActiveTool('translate')`。

### 3. 工具系统与 Gizmo

保持原有设计，使用策略模式管理 Q/W/E/R/Y 工具。
- Gizmo 仅在 `activeTool` 不为 'hand' 且有选中对象时渲染。
- 在飞行模式下，Gizmo 暂时隐藏或禁用交互，避免误触。

---

## 第三部分: 交互流程图解

### 场景 1: 普通编辑 (Orbit Mode)
- **左手**: 键盘敲击 Q/W/E/R 切换工具。
- **右手**:
  - 左键点击/框选对象。
  - 左键拖动 Gizmo 编辑对象。
  - Alt + 左键拖动旋转视角。
  - 中键平移视角。

### 场景 2: 漫游浏览 (Fly Mode)
- **触发**: 用户**按住鼠标右键**。
- **状态变更**:
  - `navigationMode` -> 'fly'
  - `PointerLock` -> 激活 (光标消失/变成十字准星)
- **操作**:
  - **右手**: 移动鼠标改变视角 (FPS 风格)。
  - **左手**: 按住 W/A/S/D 前后左右飞行，Q/E 上下升降。
  - **左手**: 按住 Shift 加速。
- **退出**: 用户**松开鼠标右键** -> 回到 Orbit Mode。

---

## 第四部分: 文件结构规划

```
src/features/editor/
├─ navigation/
│  ├─ CameraSystem.tsx             // [入口] 相机系统组件
│  ├─ OrbitController.tsx          // 轨道控制封装
│  ├─ FlyController.tsx            // 飞行控制逻辑
│  └─ useInputState.ts             // [新增] 输入状态 Hook
│
├─ shortcuts/
│  ├─ KeyboardShortcutManager.tsx  // 键盘监听组件
│  └─ shortcutRegistry.ts          // 快捷键配置表
```

## 第五部分: 实施步骤

1. **基础重构**: 创建 `CameraSystem`，将现有的 `Canvas` 相机配置移入其中。
2. **输入系统**: 实现 `KeyboardShortcutManager` 和 `useInputState`。
3. **飞行控制**: 实现 `FlyController`，连接输入状态与相机运动。
4. **集成调试**: 在 `SceneView` 中组装，调试模式切换的流畅性。
