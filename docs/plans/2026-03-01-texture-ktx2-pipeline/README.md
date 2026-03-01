# 纹理 KTX2 转换流水线 — 设计文档索引

**日期**：2026-03-01
**作者**：设计评审（brainstorming）

## 功能概述

将用户上传的 JPG/PNG 纹理图片自动转换为 GPU 友好的 KTX2（Basis Universal）格式，支持 Mipmap 生成、POT 尺寸缩放、Alpha 通道处理、色彩空间设置以及压缩质量控制，并提供转换前后的实时对比预览。

## 关键设计决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 编码位置 | 浏览器端 Web Worker + basis_encoder.wasm | 与 FBX 管线架构一致，无服务器依赖 |
| 预览方式 | 公式估算（实时） | 无需等待编码，交互流畅 |
| UI 入口 | 资产面板"纹理"标签页 | 与现有面板布局一致 |
| 存储模式 | 原始图 + KTX2 分别存储，metadata JSONB 关联 | 与 FBX→GLB 模式完全一致 |

## 文档结构

| 文档 | 内容 |
|------|------|
| [01-architecture.md](./01-architecture.md) | 整体架构、数据流、目录结构 |
| [02-components.md](./02-components.md) | 类型定义、对话框 UI、React 组件设计 |
| [03-worker-backend.md](./03-worker-backend.md) | Worker 内部处理逻辑、后端最小化改动 |

## 依赖的外部包

- `basis_encoder.wasm` — 来自 [@binomialllc/basis_universal](https://github.com/BinomialLLC/basis_universal) 或 three.js examples
- 前端无需新增 npm 包（wasm 文件作为静态资源放入 `public/`）

## 关联文档

- FBX 导入设计（参考模式）：[`docs/plans/fbx-import/README.md`](../fbx-import/README.md)
- 材质 Inspector 设计：[`docs/plans/2026-02-28-material-inspector-design.md`](../2026-02-28-material-inspector-design.md)
