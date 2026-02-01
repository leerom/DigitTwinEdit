# 🔧 后端启动错误诊断和修复

## 问题分析

### ✅ 已解决的问题

1. **bcrypt编译错误** - 已修复
   - 原因: bcrypt需要编译原生模块，pnpm忽略了构建脚本
   - 解决: 替换为bcryptjs（纯JavaScript实现）
   - 修改文件: `packages/server/src/utils/password.ts`

2. **端口占用** - 已修复
   - 原因: 之前的后台进程仍在运行
   - 解决: 终止PID 12428进程
   - 结果: 3001端口已释放

3. **后端服务器启动** - 已解决 ✅
   ```
   🚀 Server running on http://localhost:3001
   📝 Environment: development
   🔒 CORS origin: http://localhost:5173
   ```

### ❌ 当前问题

**PostgreSQL连接失败**

错误信息:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Code: ECONNREFUSED
```

**原因**:
- PostgreSQL数据库服务未运行
- 虽然你成功执行了 `CREATE DATABASE digittwinedit`
- 但PostgreSQL服务器进程可能已停止

---

## 解决方案

### 方案1: 启动PostgreSQL服务（Windows）

#### 检查PostgreSQL是否已安装

```cmd
# 查找PostgreSQL安装目录
dir "C:\Program Files\PostgreSQL" /s /b 2>nul
```

#### 启动PostgreSQL服务

```cmd
# 方式1: 使用服务管理器
services.msc
# 找到 postgresql-x64-xx 服务，点击"启动"

# 方式2: 使用命令行
net start postgresql-x64-15
# 或
net start postgresql-x64-16

# 方式3: 如果通过安装包安装
# 打开"服务"应用，找到PostgreSQL服务并启动
```

#### 验证PostgreSQL运行

```cmd
psql -U postgres -c "SELECT version();"
```

应该看到PostgreSQL版本信息。

### 方案2: 使用Docker运行PostgreSQL（推荐）

如果PostgreSQL难以启动，使用Docker是最简单的方式：

```cmd
# 1. 确保Docker Desktop已安装并运行

# 2. 启动PostgreSQL容器
docker run --name digittwinedit-postgres ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=digittwinedit ^
  -p 5432:5432 ^
  -d postgres:15

# 3. 等待5秒
timeout /t 5 /nobreak

# 4. 创建digittwinedit用户
docker exec -it digittwinedit-postgres psql -U postgres -d digittwinedit -c "CREATE USER digittwinedit WITH PASSWORD 'password'; GRANT ALL PRIVILEGES ON DATABASE digittwinedit TO digittwinedit; GRANT ALL ON SCHEMA public TO digittwinedit;"

# 5. 运行迁移脚本
docker exec -i digittwinedit-postgres psql -U postgres -d digittwinedit < packages\server\migrations\001_initial.sql
docker exec -i digittwinedit-postgres psql -U postgres -d digittwinedit < packages\server\migrations\002_create_assets_table.sql

# 6. 验证
docker exec -it digittwinedit-postgres psql -U postgres -d digittwinedit -c "\dt"
```

### 方案3: 暂时使用Mock数据测试前端

如果只想测试前端UI，我可以创建一个Mock API服务器。

---

## 快速诊断命令

### 检查PostgreSQL是否在运行

```cmd
# Windows
netstat -ano | findstr :5432

# 如果有输出，说明PostgreSQL在运行
# 如果无输出，说明未运行
```

### 测试数据库连接

```cmd
psql -U postgres -c "SELECT 1;"
```

如果失败，说明PostgreSQL未运行。

---

## 推荐步骤

### 最简单的方式：Docker

1. **安装Docker Desktop**
   - 下载: https://www.docker.com/products/docker-desktop/
   - 安装并启动

2. **运行我创建的Docker脚本**
   ```cmd
   start-postgres-docker.bat
   ```
   （我会创建这个脚本）

3. **重启后端**
   - 后端会自动连接到Docker中的PostgreSQL

### 传统方式：修复PostgreSQL服务

1. **找到PostgreSQL安装位置**
2. **启动服务**
3. **验证连接**

---

## 下一步

请选择：

**A. 使用Docker（推荐）**
- 我会创建自动化脚本
- 5分钟内完成配置
- 测试环境隔离

**B. 修复PostgreSQL服务**
- 需要手动启动服务
- 可能需要调试配置

**C. 仅测试前端UI**
- 我创建Mock API
- 快速验证UI功能

你想选择哪个方案？
