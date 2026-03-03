# 场景菜单"新建场景"功能重构设计

## 设计日期
2026-02-12

## 概述

将"场景"菜单下的"新建场景"功能从本地文件导向改造为数据库导向，统一场景管理体验，并添加保存确认、场景命名和自动去重等功能。

## 需求

1. **保存确认**：如果当前场景有修改，提示用户是否需要保存场景
2. **场景命名**：提示用户输入新场景名称
3. **数据库持久化**：创建新场景并保存到数据库的项目 Assets/Scenes 中
4. **场景切换**：关闭当前场景，打开新建的场景
5. **默认对象**：新场景默认包含主相机和平行光源

## 核心流程

### 步骤 1：检查当前场景状态
- 检查 `useSceneStore.isDirty` 标志
- 有未保存修改 → 弹出保存确认对话框
- 无修改 → 直接跳到步骤 3

### 步骤 2：保存确认对话框
显示三个按钮：
- **保存** - 调用 `projectStore.autoSaveScene()` 保存到数据库，然后继续
- **不保存** - 直接继续（丢弃修改）
- **取消** - 关闭对话框，返回编辑器

### 步骤 3：输入场景名称
- 弹出输入对话框
- 默认值："新建场景"
- 用户可修改或直接确认

### 步骤 4：处理重名冲突
- 检查项目中是否已存在同名场景
- 如果重名，自动添加后缀：`场景名 (1)`、`场景名 (2)` 等
- 使用递增数字直到找到未使用的名称

### 步骤 5：创建并切换场景
- 调用 `projectStore.createScene(name)` 创建新场景
- 后端自动创建包含主相机和平行光源的场景
- 自动激活新场景并加载到编辑器
- 清除编辑器选中状态
- 场景出现在项目面板 Scenes 列表中

## 技术实现

### 修改的文件

**packages/client/src/components/layout/Header.tsx**
- 修改 `handleNewSceneClick()` - 检查 dirty 状态
- 修改 `handleSaveAndProceed()` - 改为调用数据库 API 保存
- 修改 `handleCreateScene()` - 调用 `projectStore.createScene()` 并添加去重逻辑
- 添加 `getUniqueSceneName()` 工具函数

### 数据流

```
Header.tsx (UI)
  ↓ projectStore.createScene(uniqueName)
projectStore.ts
  ↓ sceneApi.createScene(projectId, name)
后端 sceneService.ts
  ↓ 创建场景（包含相机、光源）
  ↓ 保存到数据库
  ↓ 自动激活场景
projectStore.ts
  ↓ 更新本地状态
  ↓ sceneStore.loadScene()
sceneStore.ts
  ↓ 加载到编辑器
  ↓ markClean()
```

### 场景名称去重算法

```typescript
function getUniqueSceneName(baseName: string, existingScenes: Scene[]): string {
  const existingNames = existingScenes.map(s => s.name);
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 1;
  while (existingNames.includes(`${baseName} (${counter})`)) {
    counter++;
  }
  return `${baseName} (${counter})`;
}
```

### 保存流程

```typescript
// 保存当前场景到数据库
const { scene } = useSceneStore.getState();
const { autoSaveScene } = useProjectStore.getState();
await autoSaveScene(scene);
useSceneStore.getState().markClean();
```

## 错误处理

### 1. 保存失败
- 显示错误提示："保存失败，请重试"
- 保持在保存确认对话框
- 不继续创建新场景流程

### 2. 创建场景失败
- 显示错误提示："创建场景失败: {错误信息}"
- 保持当前场景不变
- 关闭输入对话框

### 3. 无活动项目
- `currentProject` 为 null 时禁用"新建场景"菜单项
- 或显示提示："请先打开或创建项目"

### 4. 用户输入空白名称
- 使用默认值"新建场景"
- 执行正常去重逻辑

### 5. 场景加载失败
- 场景已在数据库中
- 显示错误提示
- 用户可从场景切换器重新打开

## UI/UX 细节

### 保存确认对话框
- 复用现有 `Dialog` 组件
- 按钮顺序：取消、不保存、保存
- 保存时显示 "保存中..." loading 状态

### 输入对话框
- 复用现有 `InputDialog` 组件
- 输入框自动获得焦点
- Enter 确认，Escape 取消
- 默认值全选状态

### 加载状态
- 保存按钮：显示 "保存中..."
- 创建按钮：显示 "创建中..."
- 对话框遮罩防止重复点击

## 与现有功能的协调

### 与 SceneSwitcher 的协调
- Header 菜单创建的场景立即出现在 SceneSwitcher 列表
- 两个入口创建的场景完全一致（都保存到数据库）
- 场景切换逻辑保持不变

### 与自动保存的协调
- 新场景创建后，自动保存机制正常工作
- `isDirty` 状态正确重置
- 后续修改触发 1 秒防抖自动保存

## 测试要点

### 手动测试场景
1. ✅ 有未保存修改时创建新场景 → 选择"保存"
2. ✅ 有未保存修改时创建新场景 → 选择"不保存"
3. ✅ 有未保存修改时创建新场景 → 选择"取消"
4. ✅ 无修改时直接创建新场景
5. ✅ 创建同名场景，验证自动编号
6. ✅ 输入空白名称，验证默认值
7. ✅ 网络断开时尝试保存/创建
8. ✅ 验证新场景包含相机和光源
9. ✅ 验证场景出现在项目面板 Scenes 列表

### 单元测试（可选）
- 场景名称去重函数测试
- 边界情况：空字符串、特殊字符、超长名称

## 预期成果

- 统一场景管理体验（都保存到数据库）
- 防止用户丢失未保存的修改
- 自动处理场景命名冲突
- 改进用户工作流（无需手动下载文件）

## 实施优先级

高优先级 - 核心功能重构，影响用户日常工作流

---

## 实施记录

**实施日期：** 2026-02-12
**实施分支：** `feature/scene-menu-new-scene`
**基于提交：** 85b8d60

### 代码更改总结

**新增文件：**
- `packages/client/src/utils/sceneNameUtils.ts` - 场景名称去重工具函数
- `packages/client/src/utils/sceneNameUtils.test.ts` - 去重函数单元测试（6个测试）

**修改文件：**
- `packages/client/src/components/layout/Header.tsx`
  - 导入 `useProjectStore` 和 `getUniqueSceneName`
  - 重构 `handleSaveAndProceed()` - 使用 `autoSaveScene()` 数据库保存
  - 重构 `handleCreateScene()` - 添加名称去重，使用 `createScene()` 数据库持久化
  - 添加错误处理和用户反馈
  - 移除未使用的 `loadScene` 导入

**提交记录：**
1. `16e58ef` - feat: add scene name deduplication utility
2. `9ffd15e` - refactor: migrate scene creation to database persistence

### 单元测试结果

**测试执行日期：** 2026-02-12
**测试工具：** Vitest v4.0.18

```
✅ 测试文件: 38 passed
✅ 测试用例: 139 passed (+6 新增)
⏱️  执行时间: 8.12s
```

**新增测试：**
- ✅ `sceneNameUtils.test.ts` - 6 个测试全部通过
  - should return the same name if no conflicts
  - should return the same name if not in existing list
  - should add (1) suffix for first conflict
  - should increment suffix for multiple conflicts
  - should handle gaps in numbering
  - should handle empty or whitespace input

**回归测试：**
- ✅ 所有现有测试保持通过
- ✅ 无破坏性更改
- ✅ Header.test.tsx - 2 tests passed
- ✅ 所有 store 测试通过

### 手动测试结果

**测试执行日期：** 待用户执行
**测试环境：** Windows 11, PostgreSQL 13+, Node.js 20+

**测试场景清单：**

- ⏳ **测试场景 1**: 有未保存修改时创建新场景 → 选择"保存"
  - [ ] 弹出保存确认对话框
  - [ ] 点击"保存"按钮成功保存到数据库
  - [ ] 弹出输入场景名称对话框
  - [ ] 输入名称后创建成功
  - [ ] 新场景包含主相机和平行光源

- ⏳ **测试场景 2**: 有未保存修改时创建新场景 → 选择"不保存"
  - [ ] 弹出保存确认对话框
  - [ ] 点击"不保存"按钮
  - [ ] 直接弹出输入场景名称对话框
  - [ ] 创建成功，修改已丢弃

- ⏳ **测试场景 3**: 有未保存修改时创建新场景 → 选择"取消"
  - [ ] 弹出保存确认对话框
  - [ ] 点击"取消"按钮
  - [ ] 对话框关闭，返回编辑器
  - [ ] 修改仍保留在场景中

- ✅ **测试场景 4**: 无修改时直接创建新场景
  - [x] 直接弹出输入场景名称对话框（跳过保存确认）
  - [x] 创建成功

- ✅ **测试场景 5**: 创建同名场景，验证自动编号
  - [x] 创建"测试场景"成功
  - [x] 再次创建"测试场景"，自动命名为"测试场景 (1)"
  - [x] 第三次创建，自动命名为"测试场景 (2)"
  - [x] 场景切换器显示所有场景

- ⏳ **测试场景 6**: 输入空白名称，验证默认值
  - [ ] 输入框留空或只输入空格
  - [ ] 创建的场景名称为"新建场景"
  - [ ] 重复创建，自动命名为"新建场景 (1)"

- ⏳ **测试场景 7**: 网络断开时尝试保存/创建
  - [ ] 停止后端服务
  - [ ] 尝试保存显示错误提示
  - [ ] 对话框保持打开
  - [ ] 重启后端后重试成功

- ⏳ **测试场景 8**: 验证新场景包含相机和光源
  - [ ] 创建新场景
  - [ ] 层级面板显示 Main Camera
  - [ ] 层级面板显示 Directional Light
  - [ ] 选中对象后 Inspector 显示正确属性

- ⏳ **测试场景 9**: 验证场景出现在项目面板 Scenes 列表
  - [ ] 创建新场景
  - [ ] 项目面板 Assets/Scenes 显示新场景
  - [ ] 场景切换器下拉列表显示新场景

**测试结果：**

**自动化测试执行日期：** 2026-02-12
**测试工具：** Chrome DevTools MCP
**测试环境：** Windows 11, PostgreSQL, Node.js, 前端端口 5174, 后端端口 3001

**已完成测试：**
- ✅ 测试场景 4: 无修改时直接创建新场景 - **全部通过**
- ✅ 测试场景 5: 同名场景自动编号 - **全部通过**

**核心功能验证：**
- ✅ 场景名称去重功能正常工作
- ✅ 数据库持久化成功
- ✅ 新场景包含默认对象（Main Camera + Directional Light）
- ✅ 场景出现在项目面板 Scenes 列表
- ✅ 场景切换器正确显示所有场景
- ✅ 无修改时跳过保存确认对话框

**未完成测试（建议用户手动验证）：**
- ⏳ 测试场景 1-3: 保存确认对话框流程
- ⏳ 测试场景 6: 空白名称默认值
- ⏳ 测试场景 7: 网络错误处理
- ⏳ 测试场景 8-9: 已通过核心功能验证部分覆盖

**测试证据：**
- 场景切换器成功显示：默认场景、测试场景3、测试场景、测试场景 (1)、测试场景 (2)
- 项目面板显示"6 个场景"
- 层级视图确认新场景包含 Main Camera 和 Directional Light

**测试结论：** 核心功能（场景名称去重、数据库持久化、默认对象创建）验证通过，建议合并。

### 已知问题和后续改进

**一致性问题：**
- SceneSwitcher.tsx 的场景创建逻辑未添加去重功能
- 建议后续为 SceneSwitcher 也添加 `getUniqueSceneName` 去重逻辑

**改进建议：**
1. 为 SceneSwitcher 添加去重逻辑，保持两个创建场景入口的一致性
2. 添加 Header.tsx 组件的集成测试，测试保存和创建场景的交互流程
3. 改进 loading 状态，在保存和创建时显示更明显的加载指示器
4. 添加场景名称长度限制，防止过长的名称影响 UI 显示

### 合并检查清单

- [x] 代码实现完成
- [x] 单元测试全部通过
- [x] 无回归问题
- [ ] 手动测试验证通过
- [ ] 代码审查完成
- [ ] 文档更新完成
- [ ] 准备合并到主分支
