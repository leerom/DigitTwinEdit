# 🚀 完整系统启动和测试指南

## 当前状态

✅ **数据库**: PostgreSQL已安装并配置
✅ **迁移**: 数据库表已创建
✅ **前端**: 运行在 http://localhost:5173
⏸️ **后端**: 需要手动启动

---

## 快速启动步骤

### 方式1: 使用批处理脚本（推荐）

1. **打开新的命令行窗口**
2. **运行后端启动脚本**:
   ```cmd
   start-backend.bat
   ```
3. **等待看到消息**:
   ```
   🚀 Server running on http://localhost:3001
   📝 Environment: development
   🔒 CORS origin: http://localhost:5173
   ```

### 方式2: 手动启动

```bash
# 在项目根目录
cd packages/server
pnpm dev
```

---

## 验证后端启动

打开浏览器访问: http://localhost:3001/health

应该看到:
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T..."
}
```

---

## 完整功能测试（使用Chrome DevTools）

### 1. 注册新用户

1. 打开 http://localhost:5173
2. 点击 "Don't have an account? Register"
3. 填写信息:
   - Username: testuser
   - Email: test@example.com
   - Password: password123
4. **打开DevTools (F12) → Network标签页**
5. 点击 "Register"
6. 观察Network请求:
   ```
   POST /api/auth/register
   Status: 200 OK
   Response: { success: true, user: {...} }
   ```

### 2. 登录

1. 使用刚注册的账号登录
2. **DevTools Network查看**:
   ```
   POST /api/auth/login
   Status: 200 OK
   Set-Cookie: connect.sid=...
   ```

### 3. 创建项目

1. 点击 "Create Your First Project"
2. 输入项目名称: "Test Project"
3. **DevTools Network查看**:
   ```
   POST /api/projects
   Status: 201 Created
   Response: { project: { id: 1, name: "Test Project" } }
   ```

### 4. 进入编辑器

1. 点击项目卡片进入编辑器
2. 应该看到3D场景视图
3. **DevTools Network查看**:
   ```
   GET /api/projects/1
   GET /api/projects/1/scenes/active
   ```

### 5. 测试资产上传 🎯

这是新功能的核心测试！

1. **打开ProjectPanel**
   - 点击底部的 "资产库" 标签页

2. **选择Models文件夹**
   - 左侧文件夹树中点击 "Models"

3. **准备测试文件**
   - 准备一个.glb或.gltf模型文件
   - 或准备一个图片文件用于测试

4. **上传资产**
   - 点击 "上传" 按钮
   - 选择文件

5. **DevTools观察**:

   **Network标签页**:
   ```
   POST /api/projects/1/assets/upload
   Request Headers:
     Content-Type: multipart/form-data
   Request Payload:
     file: [binary data]
     type: model

   Response:
     Status: 201 Created
     Body: {
       success: true,
       asset: {
         id: 1,
         name: "model.glb",
         type: "model",
         file_size: 123456,
         ...
       }
     }
   ```

   **Console标签页**:
   - 查看上传进度日志
   - 无JavaScript错误

6. **验证上传成功**
   - 资产网格中显示新上传的文件卡片
   - 卡片显示文件名和类型标签
   - 如果有缩略图则显示缩略图

### 6. 测试资产下载

1. **点击资产卡片**
2. **DevTools Network查看**:
   ```
   GET /api/assets/1/download
   Status: 200 OK
   Content-Type: application/octet-stream
   Content-Disposition: attachment; filename="model.glb"
   ```

### 7. 测试资产删除

1. **点击资产卡片上的删除按钮**
2. **确认删除**
3. **DevTools Network查看**:
   ```
   DELETE /api/assets/1
   Status: 200 OK
   Response: { success: true }
   ```
4. **验证**: 资产从列表中消失

### 8. 测试纹理上传

1. **选择Textures文件夹**
2. **上传PNG/JPG图片**
3. **DevTools验证**:
   ```
   POST /api/projects/1/assets/upload
   type: texture
   ```
4. **验证缩略图生成**

### 9. 测试材质管理

1. **选择Materials文件夹**
2. **创建材质**（此功能在场景中自动创建）
3. **查看材质列表**
4. **DevTools查看**:
   ```
   GET /api/projects/1/assets?type=material
   ```

### 10. 测试场景保存（材质集成）

1. **在场景中添加对象**
2. **修改材质属性**
3. **保存场景**
4. **DevTools查看场景数据**:
   ```json
   {
     "objects": {...},
     "assets": {...},
     "materials": {
       "mat-1": {
         "id": "mat-1",
         "path": "/api/materials/123",
         "materialDbId": 123
       }
     }
   }
   ```

---

## DevTools技巧

### 过滤资产相关请求

在Network标签页的Filter框中输入:
```
/assets
```

### 查看Store状态

在Console中执行:
```javascript
// 查看资产Store
window.useAssetStore?.getState()

// 查看项目Store
window.useProjectStore?.getState()
```

### 监听上传进度

在Console中执行:
```javascript
// 监听Zustand store变化
const unsubscribe = window.useAssetStore.subscribe(
  state => console.log('Upload progress:', state.uploadProgress)
)
```

### 查看详细请求信息

1. 点击Network中的请求
2. 查看tabs:
   - **Headers**: 请求头、响应头
   - **Payload**: multipart/form-data内容
   - **Preview**: JSON响应预览
   - **Response**: 原始响应
   - **Timing**: 请求耗时分析

---

## 测试清单

### 基础功能 ✅
- [ ] 用户注册
- [ ] 用户登录
- [ ] 创建项目
- [ ] 进入编辑器

### 资产管理 🎯
- [ ] 上传模型文件 (.glb/.gltf)
- [ ] 上传纹理文件 (.png/.jpg)
- [ ] 查看资产列表
- [ ] 下载资产
- [ ] 删除资产
- [ ] 上传进度显示
- [ ] 缩略图生成（纹理）

### 材质管理 🎯
- [ ] 查看材质列表
- [ ] 材质自动保存
- [ ] 材质加载

### 场景集成 🎯
- [ ] 场景保存包含材质引用
- [ ] 场景加载恢复材质
- [ ] 资产引用正确

### DevTools验证
- [ ] Network请求全部成功
- [ ] Console无错误
- [ ] API响应格式正确
- [ ] Session cookie正常
- [ ] 文件上传正常

---

## 问题排查

### 后端无法启动

1. **检查PostgreSQL**:
   ```bash
   psql -U postgres -d digittwinedit -c "SELECT version();"
   ```

2. **检查环境变量**:
   ```bash
   cat packages/server/.env
   ```
   应该包含:
   ```
   DATABASE_URL=postgresql://digittwinedit:password@localhost:5432/digittwinedit
   ```

3. **查看错误日志**:
   - 后端启动时的错误信息

### API请求失败

1. **检查CORS**:
   - Backend必须允许 http://localhost:5173

2. **检查Session**:
   - DevTools → Application → Cookies
   - 应该有 connect.sid cookie

3. **检查认证**:
   - 某些API需要登录

### 文件上传失败

1. **检查文件大小**:
   - 限制100MB

2. **检查文件类型**:
   - 允许: .glb, .gltf, .fbx, .obj, .png, .jpg, .jpeg, .webp

3. **检查uploads目录**:
   ```bash
   ls -la packages/server/uploads/projects/1/
   ```

---

## 成功标志

当看到以下情况时，系统运行正常：

✅ 前端加载无错误
✅ 后端API响应正常
✅ 可以注册登录用户
✅ 可以创建项目
✅ 可以上传文件
✅ 资产列表显示正确
✅ DevTools Network全绿（200/201状态码）
✅ Console无红色错误

---

## 下一步

测试完成后：
1. 记录测试结果
2. 截图保存
3. 提交任何发现的问题

祝测试顺利！🎉
