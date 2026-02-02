# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目架构概述

本项目采用 **Monorepo** 架构（pnpm workspace），包含前端、后端和共享类型包：

```
digittwinedit/
├── packages/
│   ├── client/          # 前端应用（React + Vite + TypeScript）
│   ├── server/          # 后端API服务（Node.js + Express + PostgreSQL）
│   └── shared/          # 共享类型定义和工具
├── pnpm-workspace.yaml
└── package.json
```

### 技术栈

**前端（client）**:
- 框架: Vite + React + TypeScript (ESM)
- 3D 渲染: @react-three/fiber + Three.js
- 状态管理: Zustand
- 路由: React Router DOM v6
- HTTP 客户端: Axios + React Query
- 测试: Vitest（单元/组件）+ Playwright（E2E）

**后端（server）**:
- 运行时: Node.js + TypeScript
- 框架: Express
- 数据库: PostgreSQL
- 认证: Session + Cookie（connect-pg-simple）
- 密码加密: bcryptjs

---

## 常用命令

> 项目使用 pnpm 作为包管理器。所有命令在项目根目录执行。

### 安装依赖

```bash
pnpm install
```

### 本地开发

#### 仅启动前端（默认）
```bash
pnpm dev
# 或
pnpm --filter client dev
```
访问: http://localhost:5173

#### 仅启动后端
```bash
pnpm dev:server
# 或
pnpm --filter server dev
```
服务端口: http://localhost:3001

#### 同时启动前端 + 后端
```bash
pnpm dev:all
```

### 生产构建

```bash
pnpm build
```
构建顺序: shared → server → client

### 预览构建产物

```bash
pnpm preview
```

### 运行测试

#### 前端单元测试（Vitest）
```bash
pnpm test
# 或
pnpm --filter client test
```

- UI 模式：
```bash
pnpm test:ui
```

- 覆盖率：
```bash
pnpm coverage
```

#### 后端测试（Jest）
```bash
pnpm --filter server test
```

#### E2E 测试（Playwright）
```bash
pnpm --filter client test:e2e
# 或
npx playwright test
```

UI 模式：
```bash
npx playwright test --ui
```

> **测试配置**:
> - Vitest 配置: `packages/client/vite.config.ts:14`（使用 jsdom）
> - Playwright 配置: `packages/client/playwright.config.ts:4`
> - E2E 测试目录: `packages/client/tests/e2e`

---

## 数据库配置

### PostgreSQL 准备

1. **安装 PostgreSQL**（版本 ≥ 13）

2. **创建数据库**
```bash
createdb digittwinedit
```

3. **运行初始化脚本**
```bash
psql digittwinedit < packages/server/migrations/001_initial.sql
```

4. **配置环境变量**

复制 `.env.example` 并根据实际配置修改：
```bash
cd packages/server
cp .env.example .env
```

编辑 `packages/server/.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/digittwinedit
SESSION_SECRET=your-random-secret-key
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
UPLOADS_DIR=./uploads
```

### 数据库表结构

主要表:
- **users**: 用户表（username, password_hash, email）
- **projects**: 项目表（name, description, owner_id, thumbnail）
- **scenes**: 场景表（project_id, name, data[JSONB], is_active）
- **session**: Session 存储表（sid, sess, expire）

---

## 完整启动流程（含后端）

### 1️⃣ 首次设置

```bash
# 1. 安装依赖
pnpm install

# 2. 配置数据库（参考上面"数据库配置"章节）
createdb digittwinedit
psql digittwinedit < packages/server/migrations/001_initial.sql

# 3. 配置后端环境变量
cd packages/server
cp .env.example .env
# 编辑 .env 文件配置数据库连接
```

### 2️⃣ 启动服务

#### 开发模式（推荐）
在项目根目录打开两个终端：

**终端 1 - 启动后端:**
```bash
pnpm dev:server
```
✅ 后端运行在: http://localhost:3001

**终端 2 - 启动前端:**
```bash
pnpm dev
```
✅ 前端运行在: http://localhost:5173

#### 或者使用并行启动（单终端）
```bash
pnpm dev:all
```

### 3️⃣ 访问应用

打开浏览器访问: http://localhost:5173

- 首次访问会自动跳转到 `/login` 登录页
- 可以注册新用户或使用测试账户登录
- 登录成功后进入三维编辑器界面

---

## API 端点

后端服务提供以下 REST API（基础路径: `/api`）:

### 认证相关
```
POST   /api/auth/register     # 用户注册
POST   /api/auth/login        # 用户登录
POST   /api/auth/logout       # 登出
GET    /api/auth/me           # 获取当前用户信息
```

### 项目管理
```
GET    /api/projects          # 获取当前用户的项目列表
POST   /api/projects          # 创建新项目
GET    /api/projects/:id      # 获取项目详情
PUT    /api/projects/:id      # 更新项目信息
DELETE /api/projects/:id      # 删除项目
```

### 场景管理
```
GET    /api/projects/:projectId/scenes              # 获取项目的所有场景
POST   /api/projects/:projectId/scenes              # 创建新场景
GET    /api/projects/:projectId/scenes/:id          # 获取场景详情
PUT    /api/projects/:projectId/scenes/:id          # 更新场景数据（自动保存）
DELETE /api/projects/:projectId/scenes/:id          # 删除场景
PUT    /api/projects/:projectId/scenes/:id/activate # 设置为活动场景
```

### 资产管理
```
GET    /api/assets            # 获取资产列表
POST   /api/assets/upload     # 上传资产文件
DELETE /api/assets/:id         # 删除资产
```

### 材质管理
```
GET    /api/materials         # 获取材质列表
POST   /api/materials         # 创建材质
PUT    /api/materials/:id     # 更新材质
DELETE /api/materials/:id     # 删除材质
```

---


## 代码结构与运行时架构（高层视图）

### 包结构说明

#### packages/client/ (前端)
- **入口文件**: `packages/client/src/main.tsx` → 渲染 `App`
- **路径别名**: `@/*` → `packages/client/src/*`
- **路由结构**:
  - `/login` - 登录页面（`src/features/auth/LoginPage.tsx`）
  - `/editor/:projectId` - 编辑器页面（受保护路由）
  - `/` - 重定向到登录页

#### packages/server/ (后端)
- **入口文件**: `packages/server/src/app.ts`
- **目录结构**:
  - `config/` - 数据库配置
  - `middleware/` - Express 中间件（认证、错误处理、文件上传）
  - `routes/` - API 路由定义
  - `services/` - 业务逻辑层
  - `models/` - 数据模型
  - `utils/` - 工具函数

#### packages/shared/ (共享)
- **类型定义**: 前后端共享的 TypeScript 类型
- **工具函数**: 通用工具函数

---

### 前端应用架构

#### 应用入口与整体布局

- React 入口：`packages/client/src/main.tsx` → 渲染 `App`
- 路由配置：`packages/client/src/App.tsx`
  - 登录页（`LoginPage`）
  - 编辑器页（`EditorPage` - 受保护路由）
- 组合式编辑器布局：`packages/client/src/features/editor/EditorPage.tsx`
  - `MainLayout` 管理整体区域（顶部/左侧层级/中间 SceneView/右侧 Inspector/底部 Project）：`packages/client/src/components/layout/MainLayout.tsx:13`

#### Scene View（3D 视口）

- 视口组件：`packages/client/src/components/viewport/SceneView.tsx:23`
  - 基于 `@react-three/fiber` 的 `<Canvas>`；场景内容由 `SceneRenderer` 提供：`packages/client/src/features/scene/SceneRenderer.tsx`
  - 叠加层 UI：`ViewportOverlay`（右上角渲染模式/工具栏等）：`packages/client/src/components/viewport/ViewportOverlay.tsx`
  - 右下角视图 Gizmo：`ViewGizmo`：`packages/client/src/components/viewport/ViewGizmo.tsx`
  - 相机系统（轨道/Fly 等导航）：`CameraSystem`：`packages/client/src/features/editor/navigation/CameraSystem.tsx`
  - 工具 Gizmo 入口：`ActiveToolGizmo`：`packages/client/src/features/editor/tools/ActiveToolGizmo.tsx`

#### 状态管理（Zustand）

本项目核心状态集中在四个 store：

- `useAuthStore`：认证状态
  - `packages/client/src/stores/authStore.ts`
  - 关键字段：`user`、`isAuthenticated`、`login()`、`logout()`、`checkAuth()`

- `useProjectStore`：项目与场景管理
  - `packages/client/src/stores/projectStore.ts`
  - 关键字段：`currentProject`、`projects`、`currentScene`、`scenes`、`autoSaveScene()`

- `useSceneStore`：场景数据模型 + 导入/dirty 状态
  - `packages/client/src/stores/sceneStore.ts:125`
  - 保存 `scene.objects`（树形层级）、`isDirty`、导入进度等

- `useEditorStore`：编辑器交互状态（工具/导航/选中/视图模式）
  - `packages/client/src/stores/editorStore.ts:63`
  - 关键字段：`activeTool`、`selectedIds`、`navigationMode`、`viewMode`

- `useHistoryStore`：撤销/重做（命令模式）
  - `packages/client/src/stores/historyStore.ts:15`
  - `execute(cmd)` 会调用 `cmd.execute()` 并入栈；支持 `merge()` 以合并连续操作（如拖拽更新）

#### 认证与路由守卫

- 受保护路由组件：`packages/client/src/components/ProtectedRoute.tsx`
  - 检查认证状态，未认证时重定向到登录页
- 自动保存机制：`packages/client/src/features/scene/hooks/useAutoSave.ts`
  - 监听场景变化，1秒防抖后调用 API 保存


#### 命令系统（Undo/Redo）

- 命令接口：`packages/client/src/features/editor/commands/Command.ts`
- 示例命令：`packages/client/src/features/editor/commands/DeleteObjectsCommand.ts`

#### 交互系统（选择/拖拽/投放）

- 框选：`packages/client/src/features/interaction/BoxSelector.tsx`
- 选中状态同步与逻辑：`packages/client/src/features/interaction/SelectionManager.tsx`
- 拖放：`packages/client/src/features/interaction/DropManager.ts`

#### 场景导入/导出 与资源加载

- 场景管理与保存：`packages/client/src/features/scene/services/SceneManager.ts:12`（保存为 JSON 并下载）
- 场景加载/格式转换：
  - `packages/client/src/features/scene/services/SceneLoader.ts`
  - `packages/client/src/features/scene/services/SceneFormatConverter.ts`
- 模型加载：`packages/client/src/features/scene/services/ModelLoader.ts`
- 资产加载：`packages/client/src/features/assets/AssetLoader.ts`

#### Inspector（属性面板）

- Inspector 面板：`packages/client/src/components/panels/InspectorPanel.tsx`
- 常见属性组件：
  - Transform：`packages/client/src/components/inspector/TransformProp.tsx`
  - Light：`packages/client/src/components/inspector/specific/LightProp.tsx`
  - Camera：`packages/client/src/components/inspector/specific/CameraProp.tsx`
  - Twin 数据：`packages/client/src/components/inspector/TwinDataProp.tsx`

---

### 后端应用架构

#### 认证系统
- Session 存储：PostgreSQL（connect-pg-simple）
- 密码加密：bcryptjs（10轮 salt）
- 认证中间件：`packages/server/src/middleware/auth.ts`
  - `requireAuth` - 验证用户登录状态
  - 自动注入 `req.user`

#### 数据模型层
- User 模型：`packages/server/src/models/User.ts`
- Project 模型：`packages/server/src/models/Project.ts`
- Scene 模型：`packages/server/src/models/Scene.ts`
- Asset 模型：`packages/server/src/models/Asset.ts`

#### 服务层（业务逻辑）
- `authService.ts` - 用户注册、登录验证
- `projectService.ts` - 项目 CRUD 操作
- `sceneService.ts` - 场景管理、自动保存
- `assetService.ts` - 文件上传、资产管理
- `materialService.ts` - 材质管理

#### 数据迁移
- 迁移脚本目录：`packages/server/migrations/`
- `001_initial.sql` - 创建基础表结构
- `002_create_assets_table.sql` - 资产表

---

## 需求文档位置（实现功能时的对照来源）

原始需求在 `rawRequirements/`（见 `rawRequirements/README.md`）：
- `rawRequirements/SceneView功能需求.md`
- `rawRequirements/三维场景编辑器功能需求.md`
- `rawRequirements/场景编辑器(Scene View)操作指南.md`
- `rawRequirements/UI_Sample/code.html`

实施计划文档：
- `docs/plans/2026-01-31-backend-auth-system.md` - 后端认证系统实施计划

---

## 已知环境/配置备注

- **TS 路径别名**: `@/*` → `packages/client/src/*`
  - 配置位置：`packages/client/tsconfig.json:24`
  - Vite 同步别名：`packages/client/vite.config.ts:9`
- **Vitest 排除 e2e**: `packages/client/vite.config.ts:19`（`tests/e2e/**`）
- **环境变量**:
  - 前端：`packages/client/.env.development` - API 地址配置
  - 后端：`packages/server/.env` - 数据库连接、Session 密钥

---

## 快速故障排查

### 前端无法启动
```bash
# 检查依赖是否安装
pnpm install

# 检查端口占用
netstat -ano | findstr :5173  # Windows
lsof -i :5173                 # Mac/Linux
```

### 后端无法启动
```bash
# 检查数据库连接
psql -d digittwinedit -c "SELECT 1"

# 检查环境变量
cat packages/server/.env

# 查看后端日志
pnpm --filter server dev
```

### 登录失败
1. 检查后端是否运行（http://localhost:3001/health 应返回 `{"status":"ok"}`）
2. 检查浏览器控制台是否有 CORS 错误
3. 检查 PostgreSQL 是否运行
4. 检查 session 表是否存在：`psql digittwinedit -c "\dt session"`

### 场景保存失败
1. 检查用户是否已登录（`/api/auth/me` 返回用户信息）
2. 检查项目是否属于当前用户
3. 检查场景数据大小（建议 < 10MB）

---

## 相关文档链接

- [原始需求文档索引](./rawRequirements/README.md)
- [后端认证系统实施计划](./docs/plans/2026-01-31-backend-auth-system.md)

---

## 开发注意事项

1. **数据库优先**：启动前端前务必确保 PostgreSQL 已运行并初始化
2. **Session 管理**：生产环境务必修改 `SESSION_SECRET` 为随机密钥
3. **CORS 配置**：前后端跨域访问已配置，确保环境变量正确
4. **自动保存**：场景变更会在 1 秒后自动保存到服务器
5. **Monorepo 构建**：使用 `pnpm build` 会按依赖顺序构建所有包
