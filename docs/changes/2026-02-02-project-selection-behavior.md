# 项目选择界面行为变更

## 变更日期
2026-02-02

## 变更描述

修改了用户登录后进入项目的规则，移除了"只有一个项目时自动跳转"的逻辑。

### 变更前
- 用户登录后，如果只有一个项目，会自动进入该项目的编辑器界面
- 用户没有机会在项目列表页面停留

### 变更后
- **无论用户有多少个项目（包括只有一个项目），都会显示项目选择界面**
- 用户可以在项目列表页面：
  - 查看所有已有项目
  - 选择打开现有项目
  - 创建新项目
  - 登出账户

## 受影响的文件

### 修改的文件
- `packages/client/src/features/projects/ProjectsPage.tsx`
  - 移除了第 23-28 行的自动跳转逻辑（`useEffect` hook）
  - 保留了用户手动选择项目时的跳转逻辑

### 新增的文件
- `packages/client/src/features/projects/__tests__/ProjectsPage.test.tsx`
  - 添加了测试用例验证新的行为
  - 测试场景包括：
    - 只有一个项目时不自动跳转
    - 没有项目时显示空状态
    - 有多个项目时显示列表

## 用户体验改进

### 优点
1. **更好的控制权**：用户可以主动选择要打开的项目
2. **更好的可见性**：用户可以看到所有项目的概览
3. **更灵活的操作**：用户可以在项目列表页面创建新项目或管理现有项目
4. **一致的体验**：无论有多少项目，都有相同的进入流程

### 用户流程
```
登录成功
  ↓
项目列表页面 (/projects)
  ↓
选择项目 或 创建新项目
  ↓
进入编辑器 (/editor/:projectId)
```

## 技术细节

### 移除的代码
```typescript
// 当只有一个项目时，自动进入编辑器
useEffect(() => {
  if (!isLoading && projects.length === 1 && !selectedProject) {
    navigate(`/editor/${projects[0].id}`);
  }
}, [isLoading, projects, selectedProject, navigate]);
```

### 保留的代码
```typescript
// 当用户选择项目时跳转到编辑器
useEffect(() => {
  if (selectedProject) {
    navigate(`/editor/${selectedProject.id}`);
  }
}, [selectedProject, navigate]);
```

## 测试

运行以下命令验证变更：

```bash
# 运行单元测试
pnpm --filter client test

# 运行特定测试文件
pnpm --filter client test ProjectsPage.test.tsx
```

## 回滚方案

如果需要恢复原来的行为，可以在 `ProjectsPage.tsx` 的第 21 行后添加：

```typescript
// 当只有一个项目时，自动进入编辑器
useEffect(() => {
  if (!isLoading && projects.length === 1 && !selectedProject) {
    navigate(`/editor/${projects[0].id}`);
  }
}, [isLoading, projects, selectedProject, navigate]);
```

## 相关文档

- 项目架构文档：`CLAUDE.md`
- 用户流程说明：见项目路由配置 `packages/client/src/App.tsx`
