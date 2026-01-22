# SceneView 键盘鼠标交互系统实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 为数字孪生三维场景编辑器的 SceneView 组件实现完整的键盘鼠标交互系统,包括工具切换、视图导航、对象编辑和选择增强功能。

**架构:** 采用集中式键盘管理器、分层鼠标交互、工具策略模式和命令模式(支持撤销/重做)。所有交互逻辑与现有的 Zustand 状态管理集成,保证操作互不干扰且易于扩展。

**技术栈:** React + TypeScript + React Three Fiber + Zustand + Three.js + Vitest

---

## 文档结构

本实现计划分为以下章节,每个章节对应一个独立的文档文件:

### 核心文档

1. **[00-overview.md](./00-overview.md)** - 总体架构概览与实现策略
   - 系统架构设计
   - 技术栈说明
   - 实现阶段划分
   - 依赖关系图

2. **[01-types-and-utils.md](./01-types-and-utils.md)** - 类型定义与工具函数
   - 快捷键类型定义
   - 工具类型定义
   - 平台检测工具
   - 修饰键处理工具

3. **[02-state-management.md](./02-state-management.md)** - 状态管理扩展
   - editorStore 扩展
   - 工具状态管理
   - 光标状态管理
   - 修饰键状态管理

4. **[03-keyboard-shortcuts.md](./03-keyboard-shortcuts.md)** - 键盘快捷键系统
   - 快捷键注册表
   - KeyboardShortcutManager 组件
   - 上下文感知逻辑
   - 优先级处理

5. **[04-tools-system.md](./04-tools-system.md)** - 工具系统实现
   - 工具接口定义
   - HandTool (Q)
   - TranslateTool (W)
   - RotateTool (E)
   - ScaleTool (R)
   - UniversalTool (Y)

6. **[05-navigation-controls.md](./05-navigation-controls.md)** - 视图导航控制
   - EditorNavigationControls
   - FlyNavigationControls
   - 光标管理器
   - 鼠标事件处理

7. **[06-selection-system.md](./06-selection-system.md)** - 选择系统增强
   - 多选逻辑(Ctrl加选/Alt减选)
   - 全选功能
   - 框选增强
   - 选择视觉反馈

8. **[07-commands-system.md](./07-commands-system.md)** - 命令系统
   - Command 接口
   - CommandHistory (撤销/重做)
   - DuplicateCommand
   - DeleteCommand
   - ResetTransformCommand

9. **[08-integration.md](./08-integration.md)** - 系统集成
   - 组件集成方案
   - SceneView 更新
   - 事件流设计
   - 性能优化

10. **[09-testing.md](./09-testing.md)** - 测试策略
    - 单元测试计划
    - 集成测试计划
    - E2E 测试场景
    - 测试工具配置

---

## 实现阶段

### 第一阶段:基础设施 (Tasks 1-20)
- 类型定义与工具函数
- 状态管理扩展
- 键盘快捷键系统基础

### 第二阶段:工具系统 (Tasks 21-45)
- 五种编辑工具实现
- Gizmo 渲染与交互

### 第三阶段:导航与选择 (Tasks 46-65)
- 视图导航控制
- 飞行漫游模式
- 选择系统增强

### 第四阶段:命令与集成 (Tasks 66-85)
- 命令系统实现
- 系统集成
- 测试完善

---

## 快速导航

**查看特定功能的实现:**
- 工具切换 (Q/W/E/R/Y) → [03-keyboard-shortcuts.md](./03-keyboard-shortcuts.md) + [04-tools-system.md](./04-tools-system.md)
- 视图导航 (Alt+鼠标, 中键, 飞行) → [05-navigation-controls.md](./05-navigation-controls.md)
- 对象编辑 (复制/删除/重命名) → [07-commands-system.md](./07-commands-system.md)
- 选择增强 (Ctrl加选/Alt减选) → [06-selection-system.md](./06-selection-system.md)

**按开发顺序阅读:**
1. 先阅读 [00-overview.md](./00-overview.md) 了解整体架构
2. 按文档编号顺序 01 → 09 逐个实现
3. 每个文档包含完整的 TDD 流程和提交指南

---

## 约定与规范

### 代码风格
- TypeScript 严格模式
- 函数式编程优先
- 不可变数据结构 (Immer)
- 明确的类型定义

### 文件命名
- 组件: PascalCase (e.g., `KeyboardShortcutManager.tsx`)
- 工具函数: camelCase (e.g., `platform.ts`)
- 测试文件: `*.test.ts` 或 `*.test.tsx`

### 提交规范
- 遵循 Conventional Commits
- 每个 Task 完成后提交
- 提交信息格式: `feat(scope): description`

### 测试要求
- TDD 开发流程
- 每个功能先写测试
- 测试覆盖率 > 80%

---

## 依赖项

本实现计划基于以下现有依赖,无需安装新包:

- `react` - UI 框架
- `react-three/fiber` - Three.js React 绑定
- `react-three/drei` - R3F 辅助组件
- `zustand` - 状态管理
- `three` - 3D 渲染引擎
- `vitest` - 测试框架
- `@testing-library/react` - React 测试工具

---

## 开始实现

**推荐执行方式:**

1. **Subagent-Driven (当前会话)** - 在当前会话中,每个任务分发给新的子代理,任务间进行审查
2. **Parallel Session (独立会话)** - 在新会话中使用 executing-plans 技能,批量执行并设置检查点

选择执行方式后,从 [01-types-and-utils.md](./01-types-and-utils.md) 开始实现。

---

**最后更新:** 2026-01-22
