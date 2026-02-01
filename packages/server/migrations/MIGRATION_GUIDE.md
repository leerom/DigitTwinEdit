-- =====================================================
-- 完整数据库设置和迁移执行指南
-- =====================================================

## 步骤1: 创建数据库（已完成✅）

你已执行:
```sql
CREATE DATABASE digittwinedit;
```

## 步骤2: 创建用户和授权

在 psql 命令行中执行:

```bash
psql -U postgres -d digittwinedit
```

然后执行以下SQL:

```sql
-- 创建用户
CREATE USER digittwinedit WITH PASSWORD 'password';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE digittwinedit TO digittwinedit;
GRANT ALL ON SCHEMA public TO digittwinedit;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO digittwinedit;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO digittwinedit;

-- 验证
\du digittwinedit
\q
```

或者直接执行脚本:
```bash
psql -U postgres -d digittwinedit -f packages/server/migrations/000_setup_user.sql
```

## 步骤3: 运行初始迁移

```bash
psql -U postgres -d digittwinedit -f packages/server/migrations/001_initial.sql
```

## 步骤4: 运行资产表迁移

```bash
psql -U postgres -d digittwinedit -f packages/server/migrations/002_create_assets_table.sql
```

## 步骤5: 验证表创建

```bash
psql -U postgres -d digittwinedit -c "\dt"
```

应该看到以下表:
- users
- projects
- scenes
- sessions
- assets

## 步骤6: 启动后端服务

```bash
pnpm --filter server dev
```

应该看到:
```
🚀 Server running on http://localhost:3001
📝 Environment: development
🔒 CORS origin: http://localhost:5173
```

## 步骤7: 测试连接

在浏览器打开 http://localhost:5173
- 前端应该能连接到后端
- 可以注册新用户
- 可以创建项目
- 可以上传资产

## 问题排查

### 如果连接失败

1. 检查 packages/server/.env 文件:
   ```
   DATABASE_URL=postgresql://digittwinedit:password@localhost:5432/digittwinedit
   ```

2. 测试数据库连接:
   ```bash
   psql -U digittwinedit -d digittwinedit -c "SELECT version();"
   ```

3. 如果密码认证失败，检查 pg_hba.conf:
   ```
   # 找到文件位置
   psql -U postgres -c "SHOW hba_file;"

   # 编辑文件，确保有以下行
   local   all   all                     md5
   host    all   all   127.0.0.1/32      md5
   ```

### 如果表已存在错误

删除所有表重新开始:
```sql
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS scenes CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
```

然后重新运行迁移脚本。
