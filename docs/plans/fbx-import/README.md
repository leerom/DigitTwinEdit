# FBX 模型导入功能 - 设计文档索引

> 设计日期：2026-02-21
> 原始需求：`rawRequirements/import_fbx.md`

## 文档目录

| 文件 | 内容 |
|------|------|
| [01-overview.md](./01-overview.md) | 功能概述、整体架构与数据流 |
| [02-files.md](./02-files.md) | 新建文件列表与修改文件列表 |
| [03-components.md](./03-components.md) | 关键组件设计细节（对话框、Worker、Inspector） |
| [04-error-handling.md](./04-error-handling.md) | 异常处理策略与技术风险评估 |
| [05-implementation-plan.md](./05-implementation-plan.md) | 分阶段实施计划与具体任务步骤 |

## 核心决策摘��

- **转换位置**：浏览器端 Web Worker（利用 Three.js FBXLoader + GLTFExporter）
- **存储策略**：FBX（原始）+ GLB（转换后）均上传服务器；面板只显示 GLB
- **首次导入**：弹出配置对话框（类 Unity Import Settings）
- **重新导入**：Inspector 中修改设置后，从服务器下载原始 FBX 重新转换
- **无需数据库 migration**：利用现有 `metadata` JSONB 字段存储关联关系

## 快速导航

- 想了解整体流程 → [01-overview.md](./01-overview.md)
- 想知道改哪些文件 → [02-files.md](./02-files.md)
- 想了解 UI 交互细节 → [03-components.md](./03-components.md)
- 想了解异常处理 → [04-error-handling.md](./04-error-handling.md)
- 准备开始实现 → [05-implementation-plan.md](./05-implementation-plan.md)
