# Digital Twin Editor - 三维场景编辑器

> 一个功能完整的、带有后台服务和用户认证系统的 Web 三维场景编辑器

## ✨ 特性

### 核心功能
- 🔐 **用户认证系统** - 注册、登录、会话管理
- 📁 **项目管理** - 多项目支持，用户数据隔离
- 🎬 **场景管理** - 每个项目支持多个场景，实时切换
- 💾 **自动保存** - 智能防抖，场景数据自动持久化
- 🎨 **3D 编辑** - 基于 Three.js 的强大编辑器
- 🔄 **实时同步** - 场景状态与服务器实时同步

### 技术特性
- 📦 **Monorepo 架构** - 清晰的代码组织
- 🔷 **全栈 TypeScript** - 端到端类型安全
- 🧪 **完整测试** - 单元测试 + 集成测试 + E2E 测试
- 🚀 **生产就绪** - 安全、性能、可扩展

## 🛠️ 技术栈

### 后端
- Node.js + Express + TypeScript
- PostgreSQL (数据库)
- bcrypt (密码加密)
- express-session (会话管理)
- Zod (数据验证)

### 前端
- React 19 + TypeScript
- Three.js + React Three Fiber (3D 渲染)
- Zustand (状态管理)
- React Router (路由)
- Tailwind CSS (样式)
- Vite (构建工具)

### 测试
- Jest + Supertest (后端)
- Vitest + Testing Library (前端单元测试)
- Playwright (E2E 测试)

## 🚀 快速开始

### 前提条件
- Node.js >= 18.x
- pnpm >= 8.x
- PostgreSQL >= 13.x

### 1. 克隆仓库

```bash
git clone https://github.com/leerom/DigitTwinEdit.git
cd DigitTwinEdit
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 设置数据库

```bash
# 创建数据库
createdb digittwinedit

# 运行迁移
psql digittwinedit < packages/server/migrations/001_initial.sql
```

### 4. 配置环境

```bash
# 复制配置文件
cp packages/server/.env.example packages/server/.env

# 编辑 packages/server/.env
# 设置 DATABASE_URL 和 SESSION_SECRET
```

生成 SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. 启动开发服务器

**使用启动脚本 (推荐)**:
```bash
# Windows
scripts\start-dev.bat

# Linux/macOS
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

**或手动启动**:

终端1 - 后端:
```bash
cd packages/server
pnpm dev  # http://localhost:3001
```

终端2 - 前端:
```bash
cd packages/client
pnpm dev  # http://localhost:5173
```

### 6. 访问应用

打开浏览器: **http://localhost:5173**

## 📖 文档

- [快速启动指南](docs/QUICKSTART.md) - 详细的安装和配置步骤
- [测试指南](docs/TESTING_GUIDE.md) - 功能测试清单
- [完成报告](docs/ALL_TASKS_COMPLETED.md) - 开发总结
- [原始计划](docs/plans/2026-01-31-backend-auth-system.md) - 需求和设计

## 🧪 运行测试

### 后端测试
```bash
cd packages/server
pnpm test              # 运行所有测试
pnpm test:watch        # 监听模式
pnpm test:coverage     # 生成覆盖率报告
```

### 前端测试
```bash
cd packages/client
pnpm test              # 单元测试
pnpm test:ui           # UI 模式
pnpm coverage          # 覆盖率
pnpm test:e2e          # E2E 测试 (需要后端运行)
```

### 所有测试
```bash
# 从根目录
pnpm test

# 或使用验证脚本
./scripts/run-all-tests.sh    # Linux/macOS
scripts\run-all-tests.bat     # Windows
```

## 📦 构建

```bash
# 构建所有包
pnpm build

# 构建产物:
# packages/shared/dist   - 类型定义
# packages/server/dist   - 编译后的后端代码
# packages/client/dist   - 静态网页文件
```

## 🗂️ 项目结构

```
digittwinedit/
├── packages/
│   ├── shared/          # 共享类型定义
│   ├── server/          # 后端 API 服务
│   └── client/          # 前端应用
├── docs/                # 文档
├── scripts/             # 工具脚本
└── pnpm-workspace.yaml  # Monorepo 配置
```

## 🔌 API 端点

### 认证
- `POST /api/auth/register` - 注册用户
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户

### 项目
- `GET /api/projects` - 获取用户项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目

### 场景
- `GET /api/projects/:projectId/scenes` - 获取场景列表
- `GET /api/projects/:projectId/scenes/active` - 获取活动场景
- `POST /api/projects/:projectId/scenes` - 创建场景
- `GET /api/projects/:projectId/scenes/:id` - 获取场景
- `PUT /api/projects/:projectId/scenes/:id` - 更新场景
- `PUT /api/projects/:projectId/scenes/:id/activate` - 激活场景
- `DELETE /api/projects/:projectId/scenes/:id` - 删除场景

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

ISC License

## 🎯 路线图

### v1.0 (当前) ✅
- ✅ 用户认证
- ✅ 项目管理
- ✅ 场景管理
- ✅ 自动保存

### v1.1 (计划中)
- ⏳ 实时协作
- ⏳ 版本控制
- ⏳ 云端资产

### v2.0 (未来)
- ⏳ 团队协作
- ⏳ 权限系统
- ⏳ 数据分析

## 🙏 致谢

感谢所有贡献者和使用者！

---

**项目状态**: ✅ 生产就绪
**最后更新**: 2026-02-01
**版本**: 1.0.0
