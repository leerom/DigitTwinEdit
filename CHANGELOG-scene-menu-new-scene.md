# 场景菜单"新建场景"功能重构 - 变更日志

**分支:** `feature/scene-menu-new-scene`
**基于:** `master` (commit: 85b8d60)
**实施日期:** 2026-02-12

---

## 功能变更

### 新建场景功能重构

**改进:**
- ✅ 新建场景现在保存到数据库而不是下载本地文件
- ✅ 添加未保存修改的保存确认对话框
- ✅ 自动处理重复场景名称（添加编号后缀 (1), (2) 等）
- ✅ 空白名称自动使用默认值"新建场景"
- ✅ 改进错误处理和用户反馈

**技术实现:**
- 新增 `sceneNameUtils.ts` 工具模块（场景名称去重）
- 修改 `Header.tsx` 使用 `projectStore.createScene()` API
- 完整的单元测试覆盖（6 个新测试）
- 通过自动化测试验证核心功能

---

## 代码更改

### 新增文件
- `packages/client/src/utils/sceneNameUtils.ts` (37 行)
- `packages/client/src/utils/sceneNameUtils.test.ts` (55 行)

### 修改文件
- `packages/client/src/components/layout/Header.tsx` (+37/-13 行)
  - 导入 `useProjectStore` 和 `getUniqueSceneName`
  - 重构 `handleSaveAndProceed()` - 使用 `autoSaveScene()` 数据库保存
  - 重构 `handleCreateScene()` - 添加名称去重，使用 `createScene()` 数据库持久化
  - 添加错误处理和用户反馈
  - 移除未使用的 `loadScene` 导入

### 文档更新
- `docs/plans/2026-02-12-scene-menu-new-scene-redesign.md` - 设计文档
- `docs/plans/2026-02-12-scene-menu-new-scene-implementation.md` - 实施计划

**总计:** 3 个文件更改，127 行新增，13 行删除

---

## 提交记录

```
39cac59 docs: update test results for scene menu redesign
9ffd15e refactor: migrate scene creation to database persistence
16e58ef feat: add scene name deduplication utility
```

---

## 测试结果

### 单元测试
- ✅ 测试文件: 38 passed
- ✅ 测试用例: 139 passed (+6 新增)
- ⏱️  执行时间: 8.15s
- ✅ **无回归问题**

### 新增测试
- ✅ `sceneNameUtils.test.ts` - 6 个测试全部通过
  - should return the same name if no conflicts
  - should return the same name if not in existing list
  - should add (1) suffix for first conflict
  - should increment suffix for multiple conflicts
  - should handle gaps in numbering
  - should handle empty or whitespace input

### 自动化功能测试
**测试工具:** Chrome DevTools MCP
**测试日期:** 2026-02-12

- ✅ 测试场景 4: 无修改时直接创建新场景
- ✅ 测试场景 5: 同名场景自动编号

**核心功能验证:**
- ✅ 场景名称去重功能正常工作
- ✅ 数据库持久化成功
- ✅ 新场景包含默认对象（Main Camera + Directional Light）
- ✅ 场景出现在项目面板 Scenes 列表
- ✅ 场景切换器正确显示所有场景
- ✅ 无修改时跳过保存确认对话框

---

## API 依赖

**使用的后端 API:**
- `POST /api/projects/:projectId/scenes` - 创建新场景
- `PUT /api/projects/:projectId/scenes/:id` - 保存场景数据

**前端 Store:**
- `projectStore.createScene(name)` - 创建场景并保存到数据库
- `projectStore.autoSaveScene(sceneData)` - 自动保存场景
- `projectStore.scenes` - 获取场景列表用于去重

---

## 破坏性变更

**无破坏性变更**

---

## 已知问题

### 一致性问题
- SceneSwitcher.tsx 的场景创建逻辑未添加去重功能
- 建议后续为 SceneSwitcher 也添加 `getUniqueSceneName` 去重逻辑

---

## 后续改进建议

1. **为 SceneSwitcher 添加去重逻辑**
   保持两个创建场景入口的一致性

2. **添加 Header.tsx 组件的集成测试**
   测试保存和创建场景的完整交互流程

3. **改进 loading 状态**
   在保存和创建时显示更明显的加载指示器

4. **添加场景名称长度限制**
   防止过长的名称影响 UI 显示

---

## 迁移指南

**无需迁移操作**

此功能为现有功能的重构，向后兼容。用户无需任何操作，更新后即可使用新功能。

---

## 贡献者

- Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
