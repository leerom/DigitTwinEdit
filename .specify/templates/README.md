# Specify 模板文件说明

本目录包含 speckit 工具使用的所有模板文件,支持中英文两个版本。

## 模板文件列表

### 中文模板 (推荐使用) ✅

根据项目 Constitution 的"中文优先"原则,建议优先使用以下中文模板:

| 模板文件 | 用途 | 相关命令 |
|---------|------|---------|
| `spec-template.zh.md` | 功能规格说明模板 | `/speckit.specify` |
| `plan-template.zh.md` | 实施计划模板 | `/speckit.plan` |
| `tasks-template.zh.md` | 任务列表模板 | `/speckit.tasks` |
| `agent-file-template.zh.md` | 开发指南模板 | 自动生成 |
| `checklist-template.zh.md` | 检查清单模板 | `/speckit.checklist` |

### 英文模板 (保留用于参考)

原始英文模板保留用于参考或特殊情况:

| 模板文件 | 用途 |
|---------|------|
| `spec-template.md` | Feature Specification Template |
| `plan-template.md` | Implementation Plan Template |
| `tasks-template.md` | Tasks Template |
| `agent-file-template.md` | Agent Development Guidelines |
| `checklist-template.md` | Checklist Template |

## 使用指南

### 创建新功能规格

```bash
/speckit.specify <功能描述>
```

系统会自动使用 `spec-template.zh.md` 生成中文功能规格文档。

### 创建实施计划

```bash
/speckit.plan
```

基于功能规格自动生成中文实施计划,使用 `plan-template.zh.md` 模板。

### 创建任务列表

```bash
/speckit.tasks
```

基于实施计划生成中文任务列表,使用 `tasks-template.zh.md` 模板。

### 创建检查清单

```bash
/speckit.checklist <检查类型>
```

生成特定类型的中文检查清单,使用 `checklist-template.zh.md` 模板。

## 模板特性

### 中文模板的优势

1. **语言一致性**: 所有文档使用统一的中文,降低理解成本
2. **本地化内容**: 术语和说明更符合中文表达习惯
3. **Constitution 合规**: 每个模板都包含 Constitution 合规性检查清单
4. **完整性**: 包含所有必要的节和指导说明

### 模板结构

所有中文模板都遵循以下结构:

```markdown
# 标题
**元数据**: 创建日期、关联文档等

## 主要内容节
[具体内容和指导说明]

## Constitution 检查
[合规性检查清单]

## 使用说明
[如何使用本文档]
```

## Constitution 合规性

所有中文模板均符合项目 Constitution v1.1.0 的要求:

- ✅ **中文优先**: 所有模板使用中文编写
- ✅ **测试驱动开发**: 包含测试相关指导
- ✅ **架构清晰**: 强调设计模式和架构决策
- ✅ **简单至上**: 推荐 MVP 优先和渐进式开发

## 自定义模板

如果需要自定义模板:

1. 复制相应的 `.zh.md` 文件
2. 根据项目需求修改内容
3. 保持 Constitution 检查清单部分
4. 更新文件名以区分自定义版本

## 模板更新历史

- **2026-01-20**: 创建所有中文模板 (v1.1.0)
  - spec-template.zh.md
  - plan-template.zh.md
  - tasks-template.zh.md
  - agent-file-template.zh.md
  - checklist-template.zh.md

## 相关文档

- Constitution: `.specify/memory/constitution.md`
- 项目概述: `CLAUDE.md`
- 原始需求: `rawRequirements/`
