# 快速启动指南

本文档提供快速设置和运行后台服务与登录系统的步骤。

## 前提条件

1. **Node.js** >= 18.x
2. **pnpm** >= 8.x
3. **PostgreSQL** >= 13.x

## 步骤1: 数据库设置

### 1.1 创建数据库

```bash
# 使用 createdb 命令
createdb digittwinedit

# 或使用 psql
psql -U postgres
CREATE DATABASE digittwinedit;
\q
```

### 1.2 运行迁移脚本

```bash
# 从项目根目录执行
psql digittwinedit < packages/server/migrations/001_initial.sql

# 或者使用完整路径
psql -U postgres -d digittwinedit -f packages/server/migrations/001_initial.sql
```

### 1.3 验证数据库

```bash
psql digittwinedit
\dt  # 查看所有表,应该看到: users, projects, scenes, session
\q
```

## 步骤2: 配置环境变量

### 2.1 后端配置

```bash
# 复制示例配置
cp packages/server/.env.example packages/server/.env

# 编辑 .env 文件
nano packages/server/.env  # 或使用其他编辑器
```

**修改以下配置**:

```env
DATABASE_URL=postgresql://your_username:your_password@localhost:5432/digittwinedit
SESSION_SECRET=your-random-secret-key-minimum-32-chars
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**生成随机 SECRET 的方法**:

```bash
# 使用 node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 或使用 openssl
openssl rand -hex 32
```

### 2.2 前端配置

前端配置已创建: `packages/client/.env.development`

```env
VITE_API_URL=http://localhost:3001/api
```

## 步骤3: 安装依赖

```bash
# 在项目根目录执行 (如果还未执行)
pnpm install

# 如果需要批准构建脚本 (bcrypt, esbuild)
pnpm approve-builds
```

## 步骤4: 构建共享包

```bash
# 构建 shared 包 (如果还未构建)
cd packages/shared
pnpm build
cd ../..
```

## 步骤5: 启动服务

### 方式1: 分别启动 (推荐用于开发调试)

**终端1 - 启动后端**:

```bash
cd packages/server
pnpm dev
```

你应该看到:

```
> @digittwinedit/server@1.0.0 dev
> tsx watch src/app.ts

✅ Database connected
🚀 Server running on port 3001
```

**终端2 - 启动前端**:

```bash
cd packages/client
pnpm dev
```

你应该看到:

```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 方式2: 同时启动 (使用根脚本)

```bash
# 在项目根目录
pnpm dev:all
```

## 步骤6: 访问应用

打开浏览器访问: **http://localhost:5173**

应该自动跳转到登录页面 (`/login`)

## 步骤7: 测试功能

### 7.1 注册账户

1. 在登录页面点击 "Don't have an account? Register"
2. 填写用户名和密码 (密码至少6位)
3. 点击 "Register"
4. 注册成功后对话框关闭

### 7.2 创建项目

1. 点击页面上的 "Create Your First Project" 或底部的 "New Project"
2. 输入项目名称和描述
3. 点击创建

### 7.3 登录

1. 选择刚创建的项目 (点击项目卡片,会高亮显示)
2. 输入用户名和密码
3. 可选: 勾选"Remember me"
4. 点击 "Sign In"

### 7.4 编辑器操作

登录成功后进入编辑器:

1. **场景切换**: 点击 Header 中间的场景名称下拉菜单
2. **创建场景**: 在场景切换器中点击 "New Scene"
3. **添加对象**: 使用 Header 的"添加"菜单创建 3D 对象
4. **自动保存**: 对场景的修改会在1秒后自动保存 (查看Console日志)
5. **登出**: 点击右上角用户名 > Sign Out

## 常见问题

### Q1: 数据库连接失败

**错误**: `Connection refused` 或 `password authentication failed`

**解决**:

- 确保 PostgreSQL 正在运行: `pg_ctl status`
- 检查 `.env` 中的 `DATABASE_URL`
- 确保用户名、密码、数据库名正确
- 测试连接: `psql -U your_username -d digittwinedit`

### Q2: 端口被占用

**错误**: `EADDRINUSE: address already in use :::3001`

**解决**:

```bash
# 查找占用端口的进程
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# 杀掉进程或更改 .env 中的 PORT
```

### Q3: CORS 错误

**错误**: `Access to XMLHttpRequest blocked by CORS policy`

**解决**:

- 确保后端 `.env` 中 `CORS_ORIGIN=http://localhost:5173`
- 确保前端使用 `withCredentials: true`
- 重启后端服务

### Q4: Session 不保存

**错误**: 登录后刷新页面又退出登录

**解决**:

- 检查 `session` 表是否存在
- 确保 `SESSION_SECRET` 已设置
- 检查浏览器是否禁用 cookie
- 查看浏览器 Network 标签,确认响应头有 `Set-Cookie`

### Q5: 模块未找到

**错误**: `Cannot find module '@digittwinedit/shared'`

**解决**:

```bash
# 重新安装依赖
pnpm install

# 构建 shared 包
cd packages/shared && pnpm build
```

### Q6: TypeScript 错误

**错误**: 各种 TS 类型错误

**解决**:

```bash
# 清理并重新构建
pnpm clean  # 如果有
pnpm install
cd packages/shared && pnpm build
```

## API 测试 (可选)

### 使用 curl 测试

```bash
# 1. 注册
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!"}'

# 2. 登录 (保存 cookie)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"testuser","password":"Test123!"}'

# 3. 获取当前用户
curl -X GET http://localhost:3001/api/auth/me \
  -b cookies.txt

# 4. 创建项目
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"My First Project","description":"Testing API"}'

# 5. 获取项目列表
curl -X GET http://localhost:3001/api/projects \
  -b cookies.txt
```

## 开发技巧

### 查看日志

**后端日志**:

- 所有 SQL 查询都会打印
- API 请求/响应会打印
- 查看终端输出

**前端日志**:

- 打开浏览器开发者工具 (F12)
- 查看 Console 标签
- 自动保存会显示: `🔄 Auto-saving scene...` 和 `✅ Scene auto-saved successfully`

### 热重载

- **后端**: 使用 `tsx watch`,保存文件自动重启
- **前端**: Vite 热模块替换 (HMR),保存即刷新

### 数据库查询

```bash
# 查看所有用户
psql digittwinedit -c "SELECT * FROM users;"

# 查看所有项目
psql digittwinedit -c "SELECT * FROM projects;"

# 查看所有场景
psql digittwinedit -c "SELECT id, project_id, name, is_active FROM scenes;"

# 清空测试数据
psql digittwinedit -c "TRUNCATE users CASCADE;"
```

## 下一步

- 阅读 `docs/IMPLEMENTATION_PROGRESS.md` 了解实施进度
- 查看 `docs/plans/2026-01-31-backend-auth-system.md` 了解完整计划
- 开始编写测试 (参见计划文档 Phase 6)

## 停止服务

```bash
# 在各终端按 Ctrl+C
# 或关闭终端窗口
```

---

**有问题?** 检查以下文件的日志输出:

- 后端: 终端1的输出
- 前端: 终端2的输出 + 浏览器Console
- 数据库: `psql digittwinedit` 然后执行查询
