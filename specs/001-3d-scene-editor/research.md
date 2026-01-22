# 研究报告: React Three Fiber 3D 场景编辑器架构最佳实践

**分支**: `001-3d-scene-editor` | **日期**: 2026-01-20 | **状态**: 已完成

## 概要

本研究旨在确定构建基于 React Three Fiber (R3F) 的 Web 端数字孪生三维场景编辑器的最佳架构实践，重点关注 ECS 模式适配、高性能渲染、撤销/重做系统以及三维交互控件的实现。

## 关键决策

### 1. ECS (Entity-Component-System) 架构在 React 中的实现

- **决策**: 采用 **混合 React 组件式 ECS 模式**。
- **理由**:
    - 纯粹的 ECS (如 `miniplex` 或 `bitecs`) 虽然性能极致，但与 React 的声明式编程模型和组件生命周期存在摩擦，增加开发心智负担。
    - 混合模式（实体即组件，系统即 Hooks）充分利用 React 的生态优势（Props 传递数据，Hooks 封装逻辑，Context 共享状态），同时保持了 ECS 的数据驱动特性。
    - 对于 1000+ 对象规模，React 的协调开销在合理优化下完全可控，且开发效率远高于纯 ECS。
- **实施细节**:
    - **Entity**: 对应 React 组件（如 `<SceneObject />`）。
    - **Component**: 对应 React 组件的 Props 或子组件（如 `<Transform />`, `<Material />`）。
    - **System**: 对应自定义 Hooks（如 `useSelectionSystem()`, `useRenderLoop()`），在 `useFrame` 中执行逻辑。
- **替代方案已拒绝**:
    - **纯 ECS (Miniplex/Bitecs)**: 拒绝。过度优化，引入额外状态同步复杂性，牺牲 React 开发体验。
    - **传统 OOP**: 拒绝。难以利用 React 的响应式更新机制，代码耦合度高。

### 2. 高性能渲染 (InstancedMesh) 与交互

- **决策**: 采用 **"动态实例提升" (Dynamic Instance Promotion)** 策略。
- **理由**:
    - 1000+ 相同几何体对象必须使用 `InstancedMesh` 以降低 Draw Calls（从 1000+ 降至 1）。
    - 直接在 `InstancedMesh` 上进行复杂交互（高亮、独立变换）逻辑复杂且更新成本高（需操作 Matrix Buffer）。
    - "动态提升"策略平衡了性能与交互性：默认所有对象在 `InstancedMesh` 中渲染；当被选中时，临时将其隐藏并生成一个独立的 `Mesh` 用于交互；取消选中后数据回写并还原。
- **实施细节**:
    - 使用 `@react-three/drei` 的 `<Instances />` 和 `<Instance />` 组件简化管理。
    - 实现 `InstanceManager`，负责维护实例池和选中状态的切换。
    - 射线检测 (Raycasting) 直接针对 `InstancedMesh` 进行优化（Three.js 原生支持）。
- **替代方案已拒绝**:
    - **纯 Mesh**: 拒绝。1000+ 对象会导致 Draw Call 爆炸，无法满足 60fps 目标。
    - **纯 InstancedMesh 操作**: 拒绝。实现每个实例的独立材质高亮和 Gizmo 绑定极其繁琐，代码复杂度过高。

### 3. 撤销/重做系统

- **决策**: 基于 **Zustand 的不可变命令模式 (Immutable Command Pattern)**。
- **理由**:
    - Zustand 极其轻量且无 Opinioned 限制，适合处理高频更新的 3D 状态（避开 React Context 的非必要渲染）。
    - 命令模式（Execute/Undo 接口）是实现撤销/重做的标准解法。
    - 不可变状态更新（Immer）确保历史记录的可靠性，且易于序列化。
    - 支持 "命令合并" (Command Merging)，防止高频拖拽产生数千个细碎历史记录。
- **实施细节**:
    - 定义 `Command` 接口：`execute()`, `undo()`, `merge(other)`.
    - 状态存储 `historyStack` 和 `futureStack`。
    - 拖拽操作结束时才提交命令（`onPointerUp`），拖拽过程中仅更新临时状态。
- **替代方案已拒绝**:
    - **zundo (Zustand 中间件)**: 拒绝。通用快照式撤销对于 3D 场景的大量状态数据（矩阵、材质）开销过大，且缺乏对特定操作（如连续拖拽）的细粒度控制。
    - **Redux-Undo**: 拒绝。Redux 对于高频 3D 状态更新显得过重且样板代码多。

### 4. 变换控件 (Gizmo) 实现

- **决策**: 使用 **`@react-three/drei` 的 `<TransformControls />` 并进行自定义封装**。
- **理由**:
    - `TransformControls` 是 Three.js 官方实现的 React 封装，功能成熟，覆盖所有标准交互（轴锁定、平面移动、局部/世界坐标）。
    - 避免重复造轮子，专注于业务逻辑（如吸附、多选中心点计算）。
    - 社区维护活跃，与 R3F 生态集成度最高。
- **实施细节**:
    - 封装 `<EditorGizmo />` 组件，根据当前选中的对象（单选直接绑定，多选绑定到虚拟中心 Group）。
    - 监听 `onChange` 事件同步 React 状态，监听 `onMouseUp` 提交撤销命令。
    - 禁用 Gizmo 自身的射线检测以防止遮挡物体选择（配置层级）。
- **替代方案已拒绝**:
    - **自研 Gizmo**: 拒绝。实现完善的 3D 交互控件工作量巨大且易出 Bug（如万向节锁问题、投影计算）。
    - **Leva/Dat.GUI**: 拒绝。仅适合调试，不符合编辑器所见即所得的交互需求。

## 总结建议

| 领域 | 推荐方案 | 关键库/工具 | 复杂度预估 |
|------|----------|-------------|------------|
| 架构 | 混合 React 组件式 ECS | React Context, Custom Hooks | 中 |
| 渲染 | 动态 InstancedMesh 提升 | `@react-three/drei` (Instances) | 高 |
| 状态 | Zustand + 命令模式 | `zustand`, `immer` | 中 |
| 交互 | Drei TransformControls | `@react-three/drei` | 低 |

此架构在保证 React 开发体验的同时，通过针对性的优化策略解决了 Web 3D 编辑器的核心性能瓶颈，符合项目既定的技术约束。
