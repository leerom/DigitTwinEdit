# 场景菜单"新建场景"功能重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 将"场景"菜单下的"新建场景"功能从本地文件导向改造为数据库导向，添加保存确认、场景命名和自动去重功能。

**架构:** 修改 Header.tsx 组件，使其调用 projectStore 的数据库 API 而非本地文件保存。利用现有的后端场景创建 API（已包含默认相机和光源）。添加场景名称去重逻辑确保名称唯一性。

**技术栈:** React, TypeScript, Zustand, 现有 sceneApi/projectStore

---

## Task 1: 添加场景名称去重工具函数

**文件:**
- 创建: `packages/client/src/utils/sceneNameUtils.ts`
- 测试: `packages/client/src/utils/sceneNameUtils.test.ts`

**步骤 1: 编写失败的测试**

创建测试文件 `packages/client/src/utils/sceneNameUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getUniqueSceneName } from './sceneNameUtils';

describe('getUniqueSceneName', () => {
  it('should return the same name if no conflicts', () => {
    const result = getUniqueSceneName('新场景', []);
    expect(result).toBe('新场景');
  });

  it('should return the same name if not in existing list', () => {
    const existingScenes = [
      { id: 1, name: '场景1', is_active: false, updated_at: '' },
      { id: 2, name: '场景2', is_active: false, updated_at: '' },
    ];
    const result = getUniqueSceneName('新场景', existingScenes);
    expect(result).toBe('新场景');
  });

  it('should add (1) suffix for first conflict', () => {
    const existingScenes = [
      { id: 1, name: '新场景', is_active: false, updated_at: '' },
    ];
    const result = getUniqueSceneName('新场景', existingScenes);
    expect(result).toBe('新场景 (1)');
  });

  it('should increment suffix for multiple conflicts', () => {
    const existingScenes = [
      { id: 1, name: '新场景', is_active: false, updated_at: '' },
      { id: 2, name: '新场景 (1)', is_active: false, updated_at: '' },
      { id: 3, name: '新场景 (2)', is_active: false, updated_at: '' },
    ];
    const result = getUniqueSceneName('新场景', existingScenes);
    expect(result).toBe('新场景 (3)');
  });

  it('should handle gaps in numbering', () => {
    const existingScenes = [
      { id: 1, name: '新场景', is_active: false, updated_at: '' },
      { id: 2, name: '新场景 (2)', is_active: false, updated_at: '' },
    ];
    const result = getUniqueSceneName('新场景', existingScenes);
    expect(result).toBe('新场景 (1)');
  });

  it('should handle empty or whitespace input', () => {
    const result1 = getUniqueSceneName('', []);
    expect(result1).toBe('新建场景');

    const result2 = getUniqueSceneName('   ', []);
    expect(result2).toBe('新建场景');
  });
});
```

**步骤 2: 运行测试验证失败**

在 worktree 目录运行:
```bash
cd .worktrees/scene-menu-new-scene
pnpm --filter client test sceneNameUtils
```

预期输出: 测试失败，提示 `Cannot find module './sceneNameUtils'`

**步骤 3: 实现最小化代码**

创建 `packages/client/src/utils/sceneNameUtils.ts`:

```typescript
interface SceneListItem {
  id: number;
  name: string;
  is_active: boolean;
  updated_at: string;
}

/**
 * 生成唯一的场景名称
 * 如果名称已存在，则添加后缀 (1), (2), (3) 等
 * @param baseName - 基础名称
 * @param existingScenes - 现有场景列表
 * @returns 唯一的场景名称
 */
export function getUniqueSceneName(
  baseName: string,
  existingScenes: SceneListItem[]
): string {
  // 处理空白输入
  const trimmedName = baseName.trim();
  const name = trimmedName || '新建场景';

  const existingNames = existingScenes.map((s) => s.name);

  // 如果名称不存在，直接返回
  if (!existingNames.includes(name)) {
    return name;
  }

  // 找到第一个可用的编号
  let counter = 1;
  while (existingNames.includes(`${name} (${counter})`)) {
    counter++;
  }

  return `${name} (${counter})`;
}
```

**步骤 4: 运行测试验证通过**

```bash
pnpm --filter client test sceneNameUtils
```

预期输出: ✅ 所有 6 个测试通过

**步骤 5: 提交**

```bash
git add packages/client/src/utils/sceneNameUtils.ts packages/client/src/utils/sceneNameUtils.test.ts
git commit -m "feat: add scene name deduplication utility

Add getUniqueSceneName function to automatically handle scene name conflicts
by appending numbered suffixes (1), (2), etc.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 修改 Header.tsx 保存流程

**文件:**
- 修改: `packages/client/src/components/layout/Header.tsx:70-80`

**步骤 1: 备份当前实现（可选）**

当前的 `handleSaveAndProceed` 实现使用本地文件保存。我们将改为调用数据库 API。

**步骤 2: 修改保存逻辑**

在 `packages/client/src/components/layout/Header.tsx` 中：

1. 导入 `useProjectStore`:

```typescript
import { useProjectStore } from '../../stores/projectStore';
```

2. 在组件内部获取 `autoSaveScene`:

```typescript
export const Header: React.FC = () => {
  // ... 现有状态声明 ...

  const { isDirty, scene, markClean, loadScene, addObject } = useSceneStore();
  const { autoSaveScene } = useProjectStore(); // 添加这行
  const clearSelection = useEditorStore((state) => state.clearSelection);
  // ...
```

3. 修改 `handleSaveAndProceed` 函数（约第 70-75 行）:

```typescript
const handleSaveAndProceed = async () => {
  try {
    // 保存到数据库而不是下载文件
    await autoSaveScene(scene);
    markClean();
    setShowSaveConfirmDialog(false);
    setShowNewSceneDialog(true);
  } catch (error) {
    console.error('保存场景失败:', error);
    alert('保存场景失败，请重试');
    // 保持在对话框，允许用户重试
  }
};
```

**步骤 3: 手动验证（无自动化测试）**

由于这涉及 UI 交互和数据库调用，我们将在最后进行手动测试。

**步骤 4: 提交**

```bash
git add packages/client/src/components/layout/Header.tsx
git commit -m "refactor: save scene to database instead of local file

Change handleSaveAndProceed to use projectStore.autoSaveScene()
for database persistence instead of SceneManager.saveSceneToFile()
for local file download.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 修改创建场景流程添加去重逻辑

**文件:**
- 修改: `packages/client/src/components/layout/Header.tsx:82-89`

**步骤 1: 导入去重工具函数**

在 `packages/client/src/components/layout/Header.tsx` 顶部添加:

```typescript
import { getUniqueSceneName } from '../../utils/sceneNameUtils';
```

**步骤 2: 获取场景列表**

在组件内部，获取 `scenes` 和 `createScene`:

```typescript
export const Header: React.FC = () => {
  // ... 现有状态声明 ...

  const { isDirty, scene, markClean, loadScene, addObject } = useSceneStore();
  const { autoSaveScene, scenes, createScene } = useProjectStore(); // 修改这行
  const clearSelection = useEditorStore((state) => state.clearSelection);
  // ...
```

**步骤 3: 修改 `handleCreateScene` 函数（约第 82-89 行）**

```typescript
const handleCreateScene = async (name: string) => {
  try {
    // 处理空白输入
    const trimmedName = name.trim() || '新建场景';

    // 去重处理
    const uniqueName = getUniqueSceneName(trimmedName, scenes);

    // 调用 projectStore 创建场景（会自动保存到数据库并包含默认相机和光源）
    await createScene(uniqueName);

    // 清除选中状态
    clearSelection();

    // 关闭对话框
    setShowNewSceneDialog(false);
  } catch (error) {
    console.error('创建场景失败:', error);
    alert('创建场景失败，请重试');
    // 保持对话框打开，允许用户重试
  }
};
```

**步骤 4: 删除旧的本地文件创建逻辑**

原来的实现调用了 `SceneManager.createNewScene()` 和 `SceneManager.saveSceneToFile()`，现在已被 `projectStore.createScene()` 替代，它会：
- 在后端创建场景（包含默认相机和光源）
- 保存到数据库
- 自动激活场景
- 同步到 sceneStore

**步骤 5: 提交**

```bash
git add packages/client/src/components/layout/Header.tsx
git commit -m "feat: add scene name deduplication to new scene creation

- Import and use getUniqueSceneName utility
- Handle empty/whitespace input with default name
- Use projectStore.createScene() for database persistence
- Remove old SceneManager.createNewScene() local file logic

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 清理未使用的导入

**文件:**
- 修改: `packages/client/src/components/layout/Header.tsx:1-12`

**步骤 1: 检查未使用的导入**

`SceneManager` 可能仍在其他地方使用（如 `handleAddMesh`），所以保留。但检查是否有其他未使用的导入。

如果 `SceneManager` 仅用于以下场景：
- ~~`createNewScene()`~~ - 已移除
- ~~`saveSceneToFile()`~~ - 仍在"保存场景"和"导出场景"菜单项中使用

保持 `SceneManager` 导入，因为它仍在 `handleAddMesh` 和其他菜单项中使用。

**步骤 2: 运行 lint 检查（可选）**

```bash
pnpm --filter client lint
```

**步骤 3: 如果没有清理项，跳过此任务**

无需提交。

---

## Task 5: 验证与已有 SceneSwitcher 功能的一致性

**文件:**
- 查看: `packages/client/src/features/scene/components/SceneSwitcher.tsx:30-42`

**步骤 1: 对比两个创建场景的入口**

**Header.tsx 的新实现:**
```typescript
const uniqueName = getUniqueSceneName(trimmedName, scenes);
await createScene(uniqueName);
clearSelection();
```

**SceneSwitcher.tsx 的现有实现:**
```typescript
await createScene(newSceneName);
setNewSceneName('');
setIsCreating(false);
setIsOpen(false);
```

**步骤 2: 决定是否需要统一**

**差异分析:**
- Header: 有去重逻辑 ✅
- SceneSwitcher: 无去重逻辑 ❌

**建议:** 为保持一致性，SceneSwitcher 也应该添加去重逻辑。但这不在当前需求范围内。可以创建一个后续任务。

**步骤 3: 文档记录（可选改进）**

在设计文档中添加"后续改进"部分，建议为 SceneSwitcher 也添加去重逻辑。

无需提交。

---

## Task 6: 运行所有测试验证无回归

**步骤 1: 运行单元测试**

```bash
cd .worktrees/scene-menu-new-scene
pnpm --filter client test --run
```

预期输出: ✅ 所有测试通过（现在应该是 133+ 测试）

**步骤 2: 检查测试覆盖率（可选）**

```bash
pnpm --filter client coverage
```

**步骤 3: 如果有失败，调试并修复**

如果有测试失败，检查是否是由于我们的更改导致的。最可能的原因：
- Header.test.tsx 可能需要 mock `useProjectStore`

无需提交（测试通过则继续）。

---

## Task 7: 手动测试验证

**前置条件:**
- 确保 PostgreSQL 数据库运行
- 确保后端服务运行: `pnpm dev:server`（在主项目目录）
- 确保前端运行: `pnpm dev`（在 worktree 目录）

**测试场景 1: 有未保存修改时创建新场景 → 选择"保存"**

1. 打开应用，登录
2. 在场景中添加一个立方体（导致 `isDirty = true`）
3. 点击"场景" → "新建场景"
4. 验证弹出保存确认对话框
5. 点击"保存"按钮
6. 验证按钮显示"保存中..."（loading 状态）
7. 验证保存成功后弹出输入场景名称对话框
8. 输入"测试场景1"并确认
9. 验证创建成功，场景切换到新场景
10. 验证新场景包含主相机和平行光源（层级面板检查）
11. 验证场景出现在左下角项目面板的 Scenes 列表
12. 验证场景出现在右上角场景切换器下拉列表

**测试场景 2: 有未保存修改时创建新场景 → 选择"不保存"**

1. 在当前场景中添加一个球体
2. 点击"场景" → "新建场景"
3. 点击"不保存"按钮
4. 验证直接弹出输入场景名称对话框
5. 输入"测试场景2"并确认
6. 验证创建成功
7. 切换回之前的场景，验证球体不存在（修改已丢弃）

**测试场景 3: 有未保存修改时创建新场景 → 选择"取消"**

1. 在当前场景中添加一个圆柱体
2. 点击"场景" → "新建场景"
3. 点击"取消"按钮
4. 验证对话框关闭，返回编辑器
5. 验证圆柱体仍在场景中

**测试场景 4: 无修改时直接创建新场景**

1. 确保当前场景无修改（`isDirty = false`）
2. 点击"场景" → "新建场景"
3. 验证直接弹出输入场景名称对话框（跳过保存确认）
4. 输入"测试场景3"并确认
5. 验证创建成功

**测试场景 5: 创建同名场景，验证自动编号**

1. 点击"场景" → "新建场景"
2. 输入"测试场景"并确认
3. 再次点击"场景" → "新建场景"
4. 输入"测试场景"并确认
5. 验证创建的场景名称为"测试场景 (1)"
6. 重复步骤 1-2，输入"测试场景"
7. 验证创建的场景名称为"测试场景 (2)"
8. 在场景切换器中验证有"测试场景"、"测试场景 (1)"、"测试场景 (2)"

**测试场景 6: 输入空白名称，验证默认值**

1. 点击"场景" → "新建场景"
2. 输入框留空（或只输入空格），直接确认
3. 验证创建的场景名称为"新建场景"
4. 重复，验证下一个为"新建场景 (1)"

**测试场景 7: 网络断开时尝试保存/创建**

1. 停止后端服务
2. 在场景中添加对象
3. 点击"场景" → "新建场景" → "保存"
4. 验证显示错误提示："保存场景失败，请重试"
5. 验证对话框保持打开
6. 重启后端服务
7. 再次点击"保存"，验证成功

**测试场景 8: 验证新场景包含相机和光源**

1. 创建新场景
2. 打开左侧层级面板
3. 验证场景树包含：
   - Root
     - Main Camera
     - Directional Light
4. 选中 Main Camera，在右侧 Inspector 验证相机属性
5. 选中 Directional Light，在 Inspector 验证光源属性

**测试场景 9: 验证场景出现在项目面板 Scenes 列表**

1. 创建新场景"UI测试场景"
2. 打开左下角项目面板
3. 展开 Assets → Scenes
4. 验证"UI测试场景"出现在列表中
5. 验证可以从列表中右键点击场景（如果有上下文菜单功能）

---

## Task 8: 更新设计文档测试清单

**文件:**
- 修改: `docs/plans/2026-02-12-scene-menu-new-scene-redesign.md:119-128`

**步骤 1: 标记已完成的测试**

在设计文档的"测试要点"部分，将所有手动测试项标记为完成（如果都通过）。

**步骤 2: 记录测试结果**

在文档末尾添加测试结果部分：

```markdown
## 测试结果

**日期:** 2026-02-12

**测试人员:** Claude + 用户

**结果:**
- ✅ 测试场景 1: 保存并创建 - 通过
- ✅ 测试场景 2: 不保存并创建 - 通过
- ✅ 测试场景 3: 取消创建 - 通过
- ✅ 测试场景 4: 无修改直接创建 - 通过
- ✅ 测试场景 5: 同名场景自动编号 - 通过
- ✅ 测试场景 6: 空白名称默认值 - 通过
- ✅ 测试场景 7: 网络错误处理 - 通过
- ✅ 测试场景 8: 默认相机和光源 - 通过
- ✅ 测试场景 9: 项目面板显示 - 通过

**总结:** 所有功能按预期工作，准备合并。
```

**步骤 3: 提交**

```bash
git add docs/plans/2026-02-12-scene-menu-new-scene-redesign.md
git commit -m "docs: update test results for scene menu redesign

All manual test scenarios passed successfully.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: 最终代码审查和清理

**步骤 1: 检查代码质量**

```bash
pnpm --filter client lint
```

修复任何 linting 错误。

**步骤 2: 检查类型错误**

```bash
pnpm --filter client type-check
```

如果有类型错误，修复它们。

**步骤 3: 审查所有更改**

```bash
git diff master...feature/scene-menu-new-scene
```

确保：
- 没有调试代码（console.log 除外，保留有意义的错误日志）
- 没有注释掉的代码
- 代码格式一致
- 提交信息清晰

**步骤 4: 如果有清理项，提交**

```bash
git add .
git commit -m "chore: code cleanup and linting fixes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: 准备合并

**步骤 1: 运行完整测试套件**

```bash
pnpm test
```

确保所有包的测试都通过。

**步骤 2: 生成变更日志（可选）**

总结所有更改：

```markdown
## 功能变更

### 新建场景功能重构

**改进:**
- 新建场景现在保存到数据库而不是下载本地文件
- 添加未保存修改的保存确认对话框
- 自动处理重复场景名称（添加编号后缀）
- 空白名称自动使用默认值"新建场景"
- 改进错误处理和用户反馈

**技术实现:**
- 新增 `sceneNameUtils.ts` 工具模块
- 修改 `Header.tsx` 使用 `projectStore.createScene()` API
- 完整的单元测试覆盖（6 个新测试）
- 通过 9 项手动测试场景验证

**文件更改:**
- 新增: `packages/client/src/utils/sceneNameUtils.ts`
- 新增: `packages/client/src/utils/sceneNameUtils.test.ts`
- 修改: `packages/client/src/components/layout/Header.tsx`
- 更新: `docs/plans/2026-02-12-scene-menu-new-scene-redesign.md`
```

**步骤 3: 推送到远程（如果需要）**

```bash
git push -u origin feature/scene-menu-new-scene
```

**步骤 4: 通知用户准备合并或创建 PR**

告知用户：
- 所有测试通过 ✅
- 功能完整实现 ✅
- 准备合并到主分支或创建 Pull Request

---

## 预期结果

- ✅ 场景名称去重功能（6 个单元测试）
- ✅ 数据库持久化（替代本地文件下载）
- ✅ 保存确认对话框
- ✅ 错误处理和用户反馈
- ✅ 与现有功能兼容
- ✅ 所有手动测试场景通过
- ✅ 代码质量检查通过

## 后续改进建议

1. **为 SceneSwitcher 添加去重逻辑**: 保持两个创建场景入口的一致性
2. **添加 Header.tsx 组件测试**: 测试保存和创建场景的交互流程
3. **改进 loading 状态**: 在保存和创建时显示更明显的加载指示器
4. **添加场景名称长度限制**: 防止过长的名称影响 UI 显示

---

## 开发环境

**Worktree:** `.worktrees/scene-menu-new-scene`
**分支:** `feature/scene-menu-new-scene`
**基于:** `master` (commit: 85b8d60)

## 时间估算

- Task 1-3: ~15 分钟（编码）
- Task 4-6: ~5 分钟（验证）
- Task 7: ~30 分钟（手动测试）
- Task 8-10: ~10 分钟（文档和清理）

**总计:** ~60 分钟
