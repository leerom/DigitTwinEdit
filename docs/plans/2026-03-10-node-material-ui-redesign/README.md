# 节点材质编辑器 UI 重设计 — 实施计划索引

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 将节点材质编辑器的所有 UI 组件样式对齐三维编辑器设计系统，同时提升节点卡片视觉质量至 Blender/Unreal 级别

**架构:** 纯 Tailwind 设计 token 替换 + ReactFlow 内部控件通过 inline style 覆盖深色主题。所有逻辑/Hook/Store/测试不变，仅修改视觉层。

**Tech Stack:** React + Tailwind CSS (design tokens) + @xyflow/react

**设计规范文档:** `docs/plans/2026-03-10-node-material-editor-ui-redesign.md`

---

## 任务列表

| 文件 | 任务 |
|---|---|
| `NodeMaterialEditor.tsx` | [Task 1: 顶栏重设计](./01-toolbar-statusbar.md#task-1) |
| `NodeMaterialEditor.tsx` | [Task 2: 状态栏重设计](./01-toolbar-statusbar.md#task-2) |
| `NodeLibraryPanel.tsx` | [Task 3: 节点库面板](./02-node-library.md#task-3) |
| `BaseNode.tsx` | [Task 4: 节点卡片全面重设计](./03-node-card.md#task-4) |
| `InputNode.tsx` | [Task 5: 内联控件样式对齐](./03-node-card.md#task-5) |
| `NodeCanvas.tsx` | [Task 6: 画布深色主题 + MiniMap](./04-canvas.md#task-6) |
| `PropertyPanel.tsx` | [Task 7: 属性面板对齐 Inspector](./05-panels.md#task-7) |
| `PreviewPanel.tsx` | [Task 8: 预览面板标题行与错误浮层](./05-panels.md#task-8) |

## 执行顺序

Tasks 1-8 可按顺序执行。每个 Task 结束后运行类型检查并 commit。

## 验证命令

```bash
# 类型检查（预期：错误数不超过修改前的 4 个）
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "error TS" | wc -l

# 运行现有测试（预期：全部通过，无回归）
pnpm --filter client test -- --run 2>&1 | tail -5
```

## 完成检查清单

- [ ] Task 1: 顶栏 h-10 + bg-header-dark + 面包屑
- [ ] Task 2: 状态栏 h-6 + bg-header-dark + 节点统计
- [ ] Task 3: 节点库 bg-panel-dark + 色条 + hover 效果
- [ ] Task 4: 节点卡片 ring 选中 + port 圆形 + shadow
- [ ] Task 5: 内联控件 bg-bg-dark 样式
- [ ] Task 6: MiniMap + Controls 深色 + Dots 背景
- [ ] Task 7: PropertyPanel bg-panel-dark + section header
- [ ] Task 8: PreviewPanel PREVIEW 标题行 + 错误浮层图标
- [ ] 全量测试通过无回归
