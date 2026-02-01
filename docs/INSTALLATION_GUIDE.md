# 系统安装配置指南

## 环境要求

- ✅ Node.js v22.14.0
- ✅ pnpm 10.28.1
- ❌ PostgreSQL (需要安装)

## PostgreSQL 安装选项

### 选项1：Windows安装 PostgreSQL

1. **下载PostgreSQL安装程序**
   - 访问：https://www.postgresql.org/download/windows/
   - 下载PostgreSQL 15或16版本
   - 运行安装程序

2. **安装配置**
   - 端口：5432（默认）
   - 密码：设置postgres用户密码（记住此密码）
   - 区域：默认
   - 组件：全部勾选

3. **创建数据库和用户**
   ```sql
   -- 使用pgAdmin或命令行执行
   CREATE USER digittwinedit WITH PASSWORD 'password';
   CREATE DATABASE digittwinedit OWNER digittwinedit;
   GRANT ALL PRIVILEGES ON DATABASE digittwinedit TO digittwinedit;
   ```

4. **运行迁移脚本**
   ```bash
   # 在项目根目录执行
   psql -U digittwinedit -d digittwinedit -f packages/server/migrations/001_initial.sql
   psql -U digittwinedit -d digittwinedit -f packages/server/migrations/002_create_assets_table.sql
   ```

### 选项2：使用Docker (推荐)

如果已安装Docker Desktop：

```bash
# 启动PostgreSQL容器
docker run --name digittwinedit-postgres \
  -e POSTGRES_USER=digittwinedit \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=digittwinedit \
  -p 5432:5432 \
  -d postgres:15

# 等待数据库启动
sleep 5

# 运行迁移脚本
docker exec -i digittwinedit-postgres psql -U digittwinedit -d digittwinedit < packages/server/migrations/001_initial.sql
docker exec -i digittwinedit-postgres psql -U digittwinedit -d digittwinedit < packages/server/migrations/002_create_assets_table.sql
```

### 选项3：暂时跳过数据库（仅测试前端）

如果想先测试前端UI而不连接数据库：
- 前端可以独立运行
- 资产管理UI可以显示
- 但无法实际保存数据

---

## 快速开始（不使用数据库）

### 1. 安装依赖

```bash
# 在项目根目录
pnpm install
```

### 2. 启动前端

```bash
pnpm --filter client dev
```

前端将在 http://localhost:5173 启动

### 3. 使用Mock数据测试

前端可以使用本地状态测试UI交互，无需后端连接。

---

## 完整安装流程（带数据库）

### 1. 配置后端环境

```bash
# 复制环境变量模板
cp packages/server/.env.example packages/server/.env

# 编辑 packages/server/.env，确保数据库连接正确
```

### 2. 安装所有依赖

```bash
pnpm install
```

### 3. 构建shared包

```bash
pnpm --filter shared build
```

### 4. 启动后端

```bash
pnpm --filter server dev
```

后端将在 http://localhost:3001 启动

### 5. 启动前端

```bash
# 新终端窗口
pnpm --filter client dev
```

前端将在 http://localhost:5173 启动

---

## 验证安装

1. 打开浏览器访问 http://localhost:5173
2. 打开Chrome DevTools (F12)
3. 查看Console是否有错误
4. 查看Network标签页，检查API请求

---

## 下一步

安装完成后，参考 `TESTING_GUIDE.md` 进行功能测试。
