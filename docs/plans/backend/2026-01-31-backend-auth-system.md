# 三维场景编辑器 - 后台服务与登录系统实施计划

## 需求概述

为当前的三维场景编辑器创建后台服务,支持用户认证和项目/场景管理。

### 用户需求
1. 用户访问时显示登录界面,可选择项目并输入用户名密码登录
2. 支持"记住密码"功能
3. 登录成功后进入三维编辑器并打开对应项目
4. 支持多场景项目管理
5. 实时自动保存场景数据

### 技术选型(已确认)
- **后端**: Node.js + Express + TypeScript
- **数据库**: PostgreSQL
- **认证**: Session + Cookie
- **项目结构**: Monorepo (pnpm workspace)
- **项目模型**: 一个项目包含多个场景,用户只能访问自己的项目

## 架构设计

### 整体架构
```
digittwinedit/
├── packages/
│   ├── client/          # 前端应用(当前src目录迁移至此)
│   ├── server/          # 后端API服务
│   └── shared/          # 共享类型定义和工具
├── pnpm-workspace.yaml
└── package.json
```

### 数据模型

#### 1. users 表
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. projects 表
```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  thumbnail TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. scenes 表
```sql
CREATE TABLE scenes (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,  -- 存储完整的Scene对象
  is_active BOOLEAN DEFAULT false,  -- 当前激活的场景
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. sessions 表
```sql
CREATE TABLE sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX idx_sessions_expire ON sessions(expire);
```

## 实施步骤

### Phase 1: Monorepo 基础架构搭建

#### 1.1 创建 Monorepo 结构
**文件**: `pnpm-workspace.yaml` (新建)
```yaml
packages:
  - 'packages/*'
```

**文件**: `package.json` (修改根package.json)
- 添加 workspace 脚本
- 配置 pnpm

#### 1.2 迁移前端到 packages/client
- 移动 `src/` → `packages/client/src/`
- 移动 `public/`, `index.html` → `packages/client/`
- 复制并调整配置文件: `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`
- 创建 `packages/client/package.json`

#### 1.3 创建共享包 packages/shared
**关键文件**:
- `packages/shared/src/types/user.ts` - 用户类型
- `packages/shared/src/types/project.ts` - 项目类型
- `packages/shared/src/types/scene.ts` - 场景类型(复用现有Scene类型)
- `packages/shared/src/types/api.ts` - API请求/响应类型
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`

### Phase 2: 后端服务搭建 (packages/server)

#### 2.1 后端项目初始化
**目录结构**:
```
packages/server/
├── src/
│   ├── config/
│   │   └── database.ts      # PostgreSQL配置
│   ├── middleware/
│   │   ├── auth.ts          # 认证中间件
│   │   └── errorHandler.ts # 错误处理
│   ├── routes/
│   │   ├── auth.ts          # 认证路由
│   │   ├── projects.ts      # 项目管理路由
│   │   └── scenes.ts        # 场景管理路由
│   ├── services/
│   │   ├── authService.ts   # 认证逻辑
│   │   ├── projectService.ts
│   │   └── sceneService.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Project.ts
│   │   └── Scene.ts
│   ├── utils/
│   │   ├── password.ts      # bcrypt密码哈希
│   │   └── validation.ts    # 数据验证
│   └── app.ts               # Express应用
├── package.json
└── tsconfig.json
```

**依赖包**:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "express-session": "^1.17.3",
    "connect-pg-simple": "^9.0.1",
    "pg": "^8.11.3",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.17.10",
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/pg": "^8.10.9"
  }
}
```

#### 2.2 数据库配置
**文件**: `packages/server/src/config/database.ts`
- 使用 `pg` Pool 连接 PostgreSQL
- 从环境变量读取配置
- 导出数据库查询函数

**文件**: `packages/server/.env.example`
```env
DATABASE_URL=postgresql://user:password@localhost:5432/digittwinedit
SESSION_SECRET=your-secret-key-here
PORT=3001
NODE_ENV=development
```

#### 2.3 实现核心API路由

**文件**: `packages/server/src/routes/auth.ts`
```typescript
POST /api/auth/register      # 用户注册
POST /api/auth/login         # 用户登录
POST /api/auth/logout        # 登出
GET  /api/auth/me            # 获取当前用户信息
```

**文件**: `packages/server/src/routes/projects.ts`
```typescript
GET    /api/projects         # 获取当前用户的项目列表
POST   /api/projects         # 创建新项目
GET    /api/projects/:id     # 获取项目详情(包含场景列表)
PUT    /api/projects/:id     # 更新项目信息
DELETE /api/projects/:id     # 删除项目
```

**文件**: `packages/server/src/routes/scenes.ts`
```typescript
GET    /api/projects/:projectId/scenes          # 获取项目的所有场景
POST   /api/projects/:projectId/scenes          # 创建新场景
GET    /api/projects/:projectId/scenes/:id      # 获取场景详情
PUT    /api/projects/:projectId/scenes/:id      # 更新场景数据(自动保存)
DELETE /api/projects/:projectId/scenes/:id      # 删除场景
PUT    /api/projects/:projectId/scenes/:id/activate  # 设置为活动场景
```

#### 2.4 Session配置
**文件**: `packages/server/src/app.ts`
```typescript
import session from 'express-session';
import pgSession from 'connect-pg-simple';

const PgStore = pgSession(session);
app.use(session({
  store: new PgStore({ pool: dbPool }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));
```

### Phase 3: 前端集成 (packages/client)

#### 3.1 安装依赖并配置
**新增依赖**:
```json
{
  "dependencies": {
    "react-router-dom": "^6.21.0",
    "@tanstack/react-query": "^5.17.0"
  }
}
```

**文件**: `packages/client/src/config/api.ts` (新建)
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Axios instance with credentials
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});
```

**文件**: `packages/client/.env.development` (新建)
```env
VITE_API_URL=http://localhost:3001/api
```

#### 3.2 创建认证Store
**文件**: `packages/client/src/stores/authStore.ts` (新建)
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
```

#### 3.3 创建项目Store
**文件**: `packages/client/src/stores/projectStore.ts` (新建)
```typescript
interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  currentScene: Scene | null;
  scenes: Scene[];
  loadProjects: () => Promise<void>;
  loadProject: (projectId: number) => Promise<void>;
  createScene: (name: string) => Promise<void>;
  switchScene: (sceneId: number) => Promise<void>;
  autoSaveScene: (sceneData: Scene) => Promise<void>;
}
```

#### 3.4 实现登录界面
**文件**: `packages/client/src/features/auth/LoginPage.tsx` (新建)

**UI组件**:
- 左侧: 项目列表(卡片式,显示缩略图、名称、更新时间)
- 右侧: 登录表单(用户名、密码、记住我复选框、登录按钮)
- 底部: "新建项目"按钮、"注册账号"链接

**交互流程**:
1. 用户选择项目(高亮显示)
2. 输入用户名密码
3. 可选勾选"记住密码"
4. 点击登录
5. 后端验证成功 → 跳转到编辑器并加载项目

#### 3.5 修改应用入口
**文件**: `packages/client/src/App.tsx` (修改)
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { EditorPage } from './features/editor/EditorPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/editor/:projectId"
          element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**文件**: `packages/client/src/components/ProtectedRoute.tsx` (新建)
- 检查认证状态
- 未认证 → 重定向到登录页
- 已认证 → 渲染子组件

#### 3.6 重构编辑器页面
**文件**: `packages/client/src/features/editor/EditorPage.tsx` (新建)
```typescript
// 将原 App.tsx 的编辑器逻辑迁移至此
// 添加项目上下文和场景管理
```

**集成点**:
1. 从 URL 参数获取 `projectId`
2. 加载项目和活动场景
3. 监听 `sceneStore` 变化,调用自动保存API
4. Header 添加"场景切换"下拉菜单

#### 3.7 实现自动保存机制
**文件**: `packages/client/src/features/scene/hooks/useAutoSave.ts` (新建)
```typescript
export function useAutoSave() {
  const { scene, isDirty } = useSceneStore();
  const { autoSaveScene } = useProjectStore();

  useEffect(() => {
    if (isDirty) {
      const timeoutId = setTimeout(() => {
        autoSaveScene(scene);
      }, 1000); // 1秒防抖
      return () => clearTimeout(timeoutId);
    }
  }, [scene, isDirty]);
}
```

**在 EditorPage 中使用**:
```typescript
function EditorPage() {
  useAutoSave(); // 自动保存hook
  // ... 其余逻辑
}
```

### Phase 4: 数据迁移与兼容

#### 4.1 Scene数据格式兼容
**当前**: Scene 直接存储在本地/导出为JSON
**新架构**: Scene 存储在PostgreSQL的JSONB字段

**迁移策略**:
- Scene 数据结构保持不变(已定义在 `src/types/index.ts`)
- 后端直接存储完整Scene对象到 `scenes.data` JSONB字段
- 前端API调用替换原有的文件保存/加载逻辑

#### 4.2 修改现有功能

**文件**: `packages/client/src/components/layout/Header.tsx` (修改)
```typescript
// 修改"导入场景"功能:
// - 改为从当前项目的场景列表中选择
// - 或上传场景JSON并创建新场景

// 修改"导出场景"功能:
// - 保留导出为JSON功能
// - 同时触发保存到服务端

// 修改"新建场景"功能:
// - 调用 API 在当前项目下创建新场景
// - 加载新场景到编辑器

// 添加"场景切换"下拉菜单:
// - 显示当前项目的所有场景
// - 点击切换场景(保存当前 → 加载目标场景)
```

#### 4.3 SceneManager 适配
**文件**: `packages/client/src/features/scene/services/SceneManager.ts` (修改)
```typescript
// 保留 createNewScene, createMesh 等工厂方法
// 移除 saveSceneToFile (改为调用API)
// 添加 saveSceneToServer 方法
```

**文件**: `packages/client/src/features/scene/services/SceneLoader.ts` (修改)
```typescript
// 保留本地文件导入功能(用于导入外部场景)
// 添加 loadSceneFromServer 方法
```

### Phase 5: UI增强与用户体验

#### 5.1 登录页面UI
**设计要点**:
- 左侧项目列表:
  - 卡片式布局(grid)
  - 每个卡片显示: 缩略图(默认图标)、项目名、最后修改时间
  - 选中状态: 蓝色边框高亮
  - 空状态: "暂无项目,点击新建"
- 右侧登录表单:
  - 用户名输入框(自动聚焦)
  - 密码输入框(可显示/隐藏)
  - "记住我"复选框
  - "登录"按钮(选择项目后启用)
  - 错误提示(用户名或密码错误)
- 底部操作:
  - "新建项目"按钮 → 打开对话框(输入项目名、描述)
  - "还没有账号? 立即注册"链接

**文件**: `packages/client/src/features/auth/LoginPage.tsx`
**文件**: `packages/client/src/features/auth/components/ProjectCard.tsx`
**文件**: `packages/client/src/features/auth/components/LoginForm.tsx`
**文件**: `packages/client/src/features/auth/components/RegisterDialog.tsx`

#### 5.2 编辑器Header增强
**新增功能**:
- 场景切换下拉菜单(替换原"场景"菜单部分功能)
- 显示当前用户头像/用户名
- 登出按钮

**修改**: `packages/client/src/components/layout/Header.tsx`
- 添加 `<SceneSwitcher />` 组件
- 添加 `<UserMenu />` 组件

#### 5.3 场景切换器组件
**文件**: `packages/client/src/features/scene/components/SceneSwitcher.tsx` (新建)
```typescript
// 下拉菜单显示:
// - 当前项目的所有场景
// - 当前激活场景标记
// - "新建场景"选项
// - 点击场景 → 切换场景(带加载提示)
```

#### 5.4 项目设置界面(可选,Phase 6实现)
**文件**: `packages/client/src/features/project/ProjectSettingsDialog.tsx`
- 修改项目名称、描述
- 上传项目缩略图
- 删除项目(确认对话框)

### Phase 6: 测试与优化

#### 6.1 后端测试
- **单元测试**: 使用 Jest 测试 services 和 utils
- **集成测试**: 测试 API 路由(使用 supertest)
- **数据库测试**: 使用测试数据库

**文件**: `packages/server/src/__tests__/`

#### 6.2 前端测试
- **组件测试**: 使用 Vitest + React Testing Library
  - `LoginPage.test.tsx`
  - `ProjectCard.test.tsx`
  - `SceneSwitcher.test.tsx`
- **E2E测试**: 使用 Playwright
  - 登录流程
  - 项目创建
  - 场景切换
  - 自动保存

**文件**: `packages/client/tests/e2e/auth.spec.ts`
**文件**: `packages/client/tests/e2e/project.spec.ts`

#### 6.3 性能优化
- 场景数据压缩(大型场景使用gzip压缩JSONB)
- 实现场景数据增量更新(仅传输变更部分)
- 添加加载骨架屏
- 优化项目列表查询(分页、缓存)

#### 6.4 安全加固
- CSRF保护(express-csurf)
- 请求速率限制(express-rate-limit)
- SQL注入防护(参数化查询)
- XSS防护(helmet中间件)
- 密码强度验证

## 关键文件清单

### 新建文件
```
根目录:
  pnpm-workspace.yaml

packages/shared/:
  package.json
  tsconfig.json
  src/types/user.ts
  src/types/project.ts
  src/types/scene.ts
  src/types/api.ts

packages/server/:
  package.json
  tsconfig.json
  .env.example
  src/app.ts
  src/config/database.ts
  src/middleware/auth.ts
  src/middleware/errorHandler.ts
  src/routes/auth.ts
  src/routes/projects.ts
  src/routes/scenes.ts
  src/services/authService.ts
  src/services/projectService.ts
  src/services/sceneService.ts
  src/models/User.ts
  src/models/Project.ts
  src/models/Scene.ts
  src/utils/password.ts
  src/utils/validation.ts

packages/client/:
  .env.development
  src/config/api.ts
  src/stores/authStore.ts
  src/stores/projectStore.ts
  src/features/auth/LoginPage.tsx
  src/features/auth/components/ProjectCard.tsx
  src/features/auth/components/LoginForm.tsx
  src/features/auth/components/RegisterDialog.tsx
  src/features/editor/EditorPage.tsx
  src/features/scene/components/SceneSwitcher.tsx
  src/features/scene/hooks/useAutoSave.ts
  src/components/ProtectedRoute.tsx
```

### 修改文件
```
根目录:
  package.json (添加workspace配置)

packages/client/:
  src/main.tsx (添加React Router)
  src/App.tsx (重构为路由结构)
  src/components/layout/Header.tsx (添加场景切换、用户菜单)
  src/features/scene/services/SceneManager.ts (API集成)
  src/features/scene/services/SceneLoader.ts (API集成)
  vite.config.ts (调整路径)
  tsconfig.json (调整路径)
```

## 验证步骤

### 开发环境验证

#### 1. 数据库准备
```bash
# 创建PostgreSQL数据库
createdb digittwinedit

# 运行SQL脚本创建表结构
psql digittwinedit < packages/server/migrations/001_initial.sql
```

#### 2. 启动服务
```bash
# 安装依赖
pnpm install

# 启动后端服务
cd packages/server
pnpm dev  # 监听端口 3001

# 启动前端开发服务器(新终端)
cd packages/client
pnpm dev  # 监听端口 5173
```

#### 3. 功能测试清单

**认证流程**:
- [ ] 访问 `http://localhost:5173` → 自动跳转到 `/login`
- [ ] 点击"注册账号" → 创建测试账户 `testuser`
- [ ] 登录页面显示空项目列表
- [ ] 点击"新建项目" → 创建项目 "测试项目1"
- [ ] 选择项目卡片 → 输入用户名密码
- [ ] 勾选"记住我" → 点击登录
- [ ] 成功跳转到 `/editor/1` (编辑器页面)

**项目与场景管理**:
- [ ] Header显示当前用户名
- [ ] Header显示当前场景名称
- [ ] 点击场景切换器 → 显示"默认场景"(自动创建)
- [ ] 点击"新建场景" → 创建"场景2"
- [ ] 切换到"场景2" → 编辑器加载新场景
- [ ] 在场景中添加Cube对象
- [ ] 等待1秒 → 自动保存(Console显示保存成功)
- [ ] 刷新页面 → 场景数据恢复(Cube仍存在)

**导入导出兼容**:
- [ ] 点击"导出场景" → 下载 `场景2.json`
- [ ] 点击"导入场景" → 上传刚导出的JSON
- [ ] 场景数据正确加载

**多项目测试**:
- [ ] 点击用户菜单 → 登出
- [ ] 回到登录页 → 创建"测试项目2"
- [ ] 登录到项目2 → 验证项目独立性

**记住密码功能**:
- [ ] 关闭浏览器 → 重新打开
- [ ] 访问 `http://localhost:5173`
- [ ] 如果之前勾选"记住我" → 应保持登录状态

#### 4. API测试(使用Postman或curl)
```bash
# 注册用户
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}'

# 登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"testuser","password":"Test123!"}'

# 获取项目列表
curl -X GET http://localhost:3001/api/projects \
  -b cookies.txt

# 创建项目
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"API测试项目","description":"通过API创建"}'

# 保存场景
curl -X PUT http://localhost:3001/api/projects/1/scenes/1 \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d @test-scene.json
```

#### 5. 自动化测试
```bash
# 运行后端测试
cd packages/server
pnpm test

# 运行前端单元测试
cd packages/client
pnpm test

# 运行E2E测试
cd packages/client
pnpm test:e2e
```

### 生产环境部署验证

#### 1. 构建验证
```bash
# 构建所有包
pnpm build

# 验证构建产物
ls packages/client/dist
ls packages/server/dist
```

#### 2. 生产环境配置
**后端环境变量** (`packages/server/.env.production`):
```env
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:prod_pass@db.example.com:5432/digittwinedit
SESSION_SECRET=<生产环境随机密钥>
PORT=3001
CORS_ORIGIN=https://digittwinedit.example.com
```

**前端环境变量** (`packages/client/.env.production`):
```env
VITE_API_URL=https://api.digittwinedit.example.com/api
```

#### 3. Docker部署(可选)
创建 `docker-compose.yml`:
```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: digittwinedit
      POSTGRES_USER: digittwinedit
      POSTGRES_PASSWORD: <密码>
    volumes:
      - postgres_data:/var/lib/postgresql/data

  server:
    build: ./packages/server
    environment:
      DATABASE_URL: postgresql://digittwinedit:<密码>@db:5432/digittwinedit
      SESSION_SECRET: <密钥>
    depends_on:
      - db
    ports:
      - "3001:3001"

  client:
    build: ./packages/client
    ports:
      - "80:80"
    depends_on:
      - server

volumes:
  postgres_data:
```

## 潜在风险与应对

### 1. 大场景数据性能问题
**风险**: 复杂场景JSONB数据过大,导致保存/加载缓慢
**应对**:
- 实现场景数据压缩
- 添加场景数据大小限制(如10MB)
- 考虑增量更新机制(仅传输diff)

### 2. 并发编辑冲突
**风险**: 多个标签页同时编辑同一场景
**应对**:
- 前端检测多标签页(BroadcastChannel)
- 后端添加乐观锁(版本号)
- 冲突时提示用户选择保留哪个版本

### 3. Session管理问题
**风险**: Session存储在数据库,高并发时可能成为瓶颈
**应对**:
- 配置session清理定时任务
- 考虑使用Redis替代PostgreSQL存储session(生产环境)

### 4. Monorepo迁移复杂度
**风险**: 现有代码迁移到packages/client可能导致路径引用问题
**应对**:
- 保持路径别名 `@/` 指向 `packages/client/src`
- 分步迁移,先保证现有功能不受影响
- 充分测试现有功能

## 后续扩展方向

1. **实时协作编辑** (WebSocket + OT/CRDT)
2. **版本历史** (场景快照、回滚功能)
3. **资产库服务器存储** (模型、材质统一管理)
4. **团队协作** (项目成员、权限管理)
5. **云端渲染** (服务端场景预览图生成)
6. **数字孪生数据源集成** (实时数据推送)

## 总结

本计划实现了完整的后台服务和认证系统,关键特性包括:
- ✅ Monorepo架构,前后端类型共享
- ✅ Session认证,支持记住密码
- ✅ 项目多场景管理
- ✅ 实时自动保存
- ✅ 用户隔离(仅看自己的项目)
- ✅ 兼容现有场景导入导出功能

预计开发周期: **2-3周**
- Week 1: Phase 1-2 (Monorepo + 后端)
- Week 2: Phase 3-4 (前端集成 + 数据迁移)
- Week 3: Phase 5-6 (UI优化 + 测试)
