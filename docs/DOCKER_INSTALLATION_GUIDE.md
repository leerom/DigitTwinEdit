# Docker Desktop 安装指南

## 步骤1: 下载Docker Desktop

### Windows系统要求
- Windows 10 64位: 专业版、企业版或教育版 (Build 19041或更高)
- 或 Windows 11
- 启用WSL 2（Windows Subsystem for Linux）

### 下载链接

**官方下载页面**: https://www.docker.com/products/docker-desktop/

**直接下载链接**: https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe

### 下载方式

**方式1: 浏览器下载**
```
1. 访问: https://www.docker.com/products/docker-desktop/
2. 点击 "Download for Windows"
3. 保存安装程序到桌面
```

**方式2: 使用PowerShell下载**
```powershell
# 在PowerShell中运行
Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile "$env:USERPROFILE\Desktop\DockerDesktopInstaller.exe"
```

---

## 步骤2: 安装Docker Desktop

### 安装过程

1. **运行安装程序**
   - 双击 `Docker Desktop Installer.exe`
   - 如果提示UAC，点击"是"

2. **配置选项**
   - ✅ 勾选 "Use WSL 2 instead of Hyper-V"（推荐）
   - ✅ 勾选 "Add shortcut to desktop"
   - 点击 "Ok"

3. **等待安装**
   - 安装需要5-10分钟
   - 会自动下载WSL 2（如果未安装）

4. **完成安装**
   - 点击 "Close and restart"
   - **电脑会重启**

---

## 步骤3: 启动Docker Desktop

1. **重启后**
   - Docker Desktop会自动启动
   - 或从开始菜单运行 "Docker Desktop"

2. **首次启动**
   - 接受服务条款
   - 选择 "Use recommended settings"
   - 可以跳过注册（点击 "Skip"）

3. **等待Docker启动**
   - 托盘图标会显示Docker状态
   - 等待图标变为绿色（正在运行）
   - 通常需要1-2分钟

4. **验证Docker运行**
   ```cmd
   docker --version
   docker ps
   ```

   应该看到：
   ```
   Docker version 24.x.x
   CONTAINER ID   IMAGE     ...
   ```

---

## 步骤4: 启动PostgreSQL容器

### 自动化方式（推荐）

**运行我创建的脚本**:
```cmd
start-postgres-docker.bat
```

这个脚本会自动：
1. 创建PostgreSQL容器
2. 配置用户和权限
3. 运行所有迁移脚本
4. 验证表创建

### 手动方式

如果脚本有问题，手动执行：

```cmd
# 1. 创建并启动容器
docker run --name digittwinedit-postgres ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=digittwinedit ^
  -p 5432:5432 ^
  -d postgres:15

# 2. 等待启动（10秒）
timeout /t 10

# 3. 创建用户
docker exec digittwinedit-postgres psql -U postgres -d digittwinedit -c "CREATE USER digittwinedit WITH PASSWORD 'password'; GRANT ALL PRIVILEGES ON DATABASE digittwinedit TO digittwinedit; GRANT ALL ON SCHEMA public TO digittwinedit; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO digittwinedit;"

# 4. 运行迁移
docker exec -i digittwinedit-postgres psql -U postgres -d digittwinedit < packages\server\migrations\001_initial.sql
docker exec -i digittwinedit-postgres psql -U postgres -d digittwinedit < packages\server\migrations\002_create_assets_table.sql

# 5. 验证
docker exec digittwinedit-postgres psql -U postgres -d digittwinedit -c "\dt"
```

---

## 步骤5: 启动真实后端

停止Mock服务器并启动真实后端：

```cmd
# 1. 停止Mock服务器
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *mock*"

# 2. 启动真实后端
cd packages\server
pnpm dev
```

应该看到：
```
🚀 Server running on http://localhost:3001
📝 Environment: development
🔒 CORS origin: http://localhost:5173
✅ Database connected successfully
```

---

## 验证安装成功

### 检查Docker

```cmd
docker ps
```

应该看到：
```
CONTAINER ID   IMAGE         STATUS    PORTS                    NAMES
xxxxx          postgres:15   Up        0.0.0.0:5432->5432/tcp   digittwinedit-postgres
```

### 检查数据库

```cmd
docker exec -it digittwinedit-postgres psql -U postgres -d digittwinedit -c "\dt"
```

应该看到5个表：
```
 users
 projects
 scenes
 sessions
 assets
```

### 检查后端连接

```cmd
curl http://localhost:3001/health
```

应该返回：
```json
{"status":"ok","timestamp":"..."}
```

---

## 常见问题

### Docker Desktop启动失败

**错误**: WSL 2 installation is incomplete

**解决**:
```cmd
# 安装WSL 2
wsl --install
wsl --set-default-version 2
```

### 容器启动失败

**错误**: port 5432 already in use

**解决**:
```cmd
# 查找占用进程
netstat -ano | findstr :5432

# 停止旧容器
docker stop digittwinedit-postgres
docker rm digittwinedit-postgres
```

### Docker下载慢

**解决**: 使用国内镜像源
- 在Docker Desktop设置中配置镜像加速

---

## 快速启动命令

```cmd
# 完整流程（复制粘贴执行）

# 1. 启动PostgreSQL（如果容器存在）
docker start digittwinedit-postgres

# 2. 或创建新容器（如果不存在）
start-postgres-docker.bat

# 3. 启动后端
cd packages\server
pnpm dev

# 4. 测试
curl http://localhost:3001/health
```

---

## 下一步

安装完成后：
1. ✅ 验证Docker运行
2. ✅ 启动PostgreSQL容器
3. ✅ 运行迁移脚本
4. ✅ 启动真实后端
5. ✅ 使用Chrome DevTools完整测试

---

**开始安装吧！完成后告诉我，我会立即帮你启动容器并完成测试！** 🚀
