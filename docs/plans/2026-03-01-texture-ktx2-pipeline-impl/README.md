# 纹理 KTX2 转换流水线 — 实施计划索引

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在资产面板"纹理"标签页添加一键将 JPG/PNG 转换为 KTX2（Basis Universal）格式的流水线，涵盖 Mipmap、POT 缩放、Alpha 处理、色彩空间和质量控制。

**Architecture:** 浏览器端 Web Worker + `ktx2-encoder`（封装 basis_encoder.wasm）完成编码，编码后分别上传原始图和 KTX2 到服务器，完全复用现有 FBX 管线的存储约定（metadata JSONB 关联）。

**Tech Stack:** React + TypeScript, `ktx2-encoder@0.5.1`, Vite Web Worker, Zustand, @testing-library/react, Vitest

---

## 任务文件列表

| 文件 | 内容 |
|------|------|
| [task-01-foundation.md](./task-01-foundation.md) | WASM 静态资源 + 类型定义 + 工具函数（POT/Alpha/大小估算）|
| [task-02-worker.md](./task-02-worker.md) | textureWorker.ts（Web Worker 内 KTX2 编码）|
| [task-03-converter.md](./task-03-converter.md) | TextureConverter.ts（协调器：校验/Worker 管理/上传）|
| [task-04-dialog.md](./task-04-dialog.md) | TextureImportDialog.tsx（设置 UI + 实时对比预览）|
| [task-05-hook-panel.md](./task-05-hook-panel.md) | useTextureImport.ts + ProjectPanel.tsx 集成 |
| [task-06-backend-render.md](./task-06-backend-render.md) | 后端 upload.ts 改动 + materialFactory KTX2 渲染支持 |

## 执行顺序

```
Task 01 → Task 02 → Task 03 → Task 04 → Task 05 → Task 06
（依赖关系：每个 Task 依赖上一个）
```

## 关键文件路径速查

**新建：**
```
packages/client/public/basis/basis_encoder.wasm
packages/client/public/basis/basis_encoder.js
packages/client/src/features/textures/types.ts
packages/client/src/features/textures/estimateKTX2.ts
packages/client/src/features/textures/textureWorker.ts
packages/client/src/features/textures/TextureConverter.ts
packages/client/src/features/textures/TextureImportDialog.tsx
packages/client/src/features/textures/useTextureImport.ts
packages/client/src/features/textures/__tests__/estimateKTX2.test.ts
packages/client/src/features/textures/__tests__/TextureConverter.test.ts
packages/client/src/features/textures/__tests__/TextureImportDialog.test.tsx
```

**修改：**
```
packages/server/src/middleware/upload.ts   (+image/ktx2)
packages/client/src/components/panels/ProjectPanel.tsx   (纹理标签页入口)
packages/client/src/features/materials/materialFactory.ts  (KTX2 纹理加载)
```

## 设计文档参考

完整架构、数据流、UI 草图详见：
`docs/plans/2026-03-01-texture-ktx2-pipeline/`
