# FBX 模型导入 - Phase 1 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让用户能从「添加 → 模型 → 导入 FBX」菜单选择 FBX 文件，通过配置对话框设置导入参数，在浏览器端 Web Worker 中转换为 GLB，上传到服务器，并在 Models 面板中看到转换后的 GLB 资产。

**Architecture:** 前端用 Three.js FBXLoader（在 Web Worker 中运行）解析 FBX 并用 GLTFExporter 导出 GLB；FBXImporter 协调器管理 Worker 生命周期和两次串行上传（FBX + GLB）；资产元数据通过现有的 `PUT /api/assets/:id` 端点存储导入配置；Models 面板客户端过滤原始 FBX 文件。

**Tech Stack:** React + TypeScript, Three.js r173 (FBXLoader + GLTFExporter), Zustand (assetStore), Vite Web Worker (ES Module), Vitest + @testing-library/react

---

## 任务文档索引

| 文件 | 任务 | 描述 |
|------|------|------|
| [task-1-1-2-foundation.md](./task-1-1-2-foundation.md) | 1.1 + 1.2 | 类型定义 + 依赖确认 |
| [task-1-3-worker.md](./task-1-3-worker.md) | 1.3 | fbxWorker.ts（Web Worker）|
| [task-1-4-dialog.md](./task-1-4-dialog.md) | 1.4 | FBXImportDialog 配置对话框 |
| [task-1-5-importer.md](./task-1-5-importer.md) | 1.5 | FBXImporter 协调器 |
| [task-1-6-7-8-integration.md](./task-1-6-7-8-integration.md) | 1.6 + 1.7 + 1.8 | Header菜单 + 后端上传限制 + 面板过滤 |

## 依赖关系

```
任务 1.1 → 任务 1.2 → 任务 1.3 ──┐
                        任务 1.4 ──┤→ 任务 1.5 → 任务 1.6 → 任务 1.8
                                              → 任务 1.7（独立）
```

## 关键文件一览

**新建：**
- `packages/client/src/features/fbx/types.ts`
- `packages/client/src/features/fbx/fbxWorker.ts`
- `packages/client/src/features/fbx/FBXImportDialog.tsx`
- `packages/client/src/features/fbx/FBXImporter.ts`
- `packages/client/src/features/fbx/__tests__/FBXImportDialog.test.tsx`
- `packages/client/src/features/fbx/__tests__/FBXImporter.test.ts`

**修改：**
- `packages/client/src/components/layout/Header.tsx`
- `packages/client/src/components/panels/ProjectPanel.tsx`
- `packages/server/src/middleware/upload.ts`（更新 fileSize 限制）

## 测试方法

每个任务完成后运行：
```bash
pnpm --filter client test --run
```

Phase 1 全部完成后，手动端到端测试：
1. 启动前后端：`pnpm dev:all`
2. 访问 http://localhost:5173，登录后进入项目
3. 点击「添加」→「模型」→「导入 FBX」
4. 选择一个 FBX 文件（建议用 < 5MB 的测试文件）
5. 在对话框中确认设置，点击「导入」
6. 观察进度条，导入完成后查看 Models 面板
