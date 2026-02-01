# Chrome DevTools 测试指南

## 当前系统状态

✅ **前端服务器**: 运行中 - http://localhost:5173
❌ **后端服务器**: 未运行 (需要PostgreSQL)
❌ **数据库**: 未配置

## 测试选项

### 选项1: 前端UI测试（无后端）

即使没有后端，我们也可以测试前端UI组件：

1. **测试资产管理UI界面**
   - 查看ProjectPanel组件
   - 测试文件夹导航
   - 测试UI响应

2. **使用Chrome DevTools**
   ```
   - Console: 查看前端日志
   - Network: 查看API请求（会失败但可以看到请求格式）
   - React DevTools: 查看组件状态
   ```

### 选项2: 完整功能测试（需要后端）

要完整测试资产上传下载功能，需要：

1. **安装PostgreSQL** (参考 `docs/INSTALLATION_GUIDE.md`)
2. **启动后端服务**
   ```bash
   pnpm --filter server dev
   ```
3. **测试完整流程**
   - 用户注册/登录
   - 创建项目
   - 上传资产文件
   - 下载资产
   - 场景保存

---

## 快速测试步骤

### 当前可执行的测试

#### 1. 测试前端应用加载

- ✅ 应用已在 http://localhost:5173 运行
- ✅ 显示登录页面
- ✅ 路由正常工作

#### 2. 使用DevTools查看Console

打开 Chrome DevTools (F12)，查看：
- JavaScript错误
- 网络请求
- 状态管理

#### 3. 测试UI组件

可以直接在浏览器中：
- 查看登录界面
- 测试表单验证
- 查看响应式布局

---

## 完整测试流程（需要数据库）

### 步骤1: 准备数据库

#### Windows快速安装PostgreSQL

```powershell
# 使用Chocolatey安装（如果已安装choco）
choco install postgresql

# 或者手动下载安装
# https://www.postgresql.org/download/windows/
```

#### 创建数据库

```sql
-- 使用pgAdmin或psql命令行
CREATE USER digittwinedit WITH PASSWORD 'password';
CREATE DATABASE digittwinedit OWNER digittwinedit;
```

#### 运行迁移

```bash
# 在项目根目录
psql -U digittwinedit -d digittwinedit -f packages/server/migrations/001_initial.sql
psql -U digittwinedit -d digittwinedit -f packages/server/migrations/002_create_assets_table.sql
```

### 步骤2: 启动后端

```bash
pnpm --filter server dev
```

应该看到：
```
🚀 Server running on http://localhost:3001
📝 Environment: development
🔒 CORS origin: http://localhost:5173
```

### 步骤3: 测试注册登录

1. 打开 http://localhost:5173/login
2. 点击 "Register"
3. 使用DevTools Network标签查看API请求
4. 注册新用户并登录

### 步骤4: 测试资产管理

1. 登录后创建项目
2. 进入项目编辑器
3. 打开ProjectPanel（资产库标签）
4. 测试上传功能：
   - 选择Models文件夹
   - 点击上传按钮
   - 选择.glb或.gltf文件
   - 在DevTools Network查看上传请求
   - 查看上传进度

5. 使用DevTools验证：
   ```javascript
   // Console中查看store状态
   window.__zustand_stores__ // 如果启用了devtools

   // 查看上传的文件
   fetch('http://localhost:3001/api/projects/1/assets')
     .then(r => r.json())
     .then(console.log)
   ```

---

## DevTools测试清单

### Network标签页

- [ ] 查看 `/api/auth/register` 请求
- [ ] 查看 `/api/auth/login` 请求
- [ ] 查看 `/api/projects` 请求
- [ ] 查看 `/api/projects/:id/assets/upload` 请求
- [ ] 查看 `/api/assets/:id/download` 请求
- [ ] 验证请求头（Content-Type, Cookies）
- [ ] 验证响应状态码

### Console标签页

- [ ] 检查是否有JavaScript错误
- [ ] 查看上传进度日志
- [ ] 测试Zustand store状态

### Application标签页

- [ ] 查看Cookies（session信息）
- [ ] 查看LocalStorage
- [ ] 查看SessionStorage

### Performance标签页

- [ ] 记录上传性能
- [ ] 查看渲染性能
- [ ] 分析内存使用

---

## 当前建议

由于PostgreSQL未安装，我现在将：

1. ✅ 前端已启动 - 可以测试UI
2. ⏳ 创建测试报告 - 记录当前可测试的内容
3. 📝 提供完整安装指南

下一步：你可以选择安装PostgreSQL以测试完整功能，或者我可以帮你测试前端UI部分。
