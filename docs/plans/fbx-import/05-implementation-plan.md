# 05 - 分阶段实施计划

## 阶段划分

```
Phase 1：核心导入流程          （必须完成）
Phase 2：Inspector 重新导入    （完整功能）
Phase 3：优化与细节            （体验提升）
```

---

## Phase 1：核心导入流程

**目标：** 用户能从「添加」菜单选择 FBX 文件，经过对话框配置后，成功导入并在 Models 面板中看到 GLB 资产。

### 任务 1.1：类型定义
- [ ] 新建 `packages/client/src/features/fbx/types.ts`
- 定义 `FBXImportSettings`、`DEFAULT_FBX_IMPORT_SETTINGS`
- 定义 Worker 消息类型 `WorkerInput`、`WorkerOutput`

### 任务 1.2：验证 FBXLoader 在 Worker 中可用
- [ ] 新建临时测试文件，在 Worker 中 import FBXLoader，确认无报错
- [ ] 检查 `fflate` 是否需要安装：`pnpm --filter client add fflate`

### 任务 1.3：Web Worker 实现
- [ ] 新建 `packages/client/src/features/fbx/fbxWorker.ts`
- 实现 FBXLoader.parse() + 缩放应用 + GLTFExporter.parseAsync()
- 实现进度消息 (progress)、完成消息 (done)、错误消息 (error)
- 实现法线计算（`normals: 'calculate'` 分支）

### 任务 1.4：FBXImportDialog UI
- [ ] 新建 `packages/client/src/features/fbx/FBXImportDialog.tsx`
- 实现三个配置区域（场景/几何/保存）
- 实现法线模式的联动禁用逻辑
- 使用现有 `Dialog.tsx` 作为容器

### 任务 1.5：FBXImporter 协调器
- [ ] 新建 `packages/client/src/features/fbx/FBXImporter.ts`
- 实现文件校验（大小、后缀名）
- 实现 Worker 生命周期管理（启动、超时、终止）
- 实现两次顺序文件上传（FBX → GLB）
- 实现进度汇总和错误处理

### 任务 1.6：Header 菜单修改
- [ ] 修改 `packages/client/src/components/layout/Header.tsx`
- 将「模型」菜单项改为有子菜单
- 添加「导入 FBX」子项，绑定点击事件
- 添加 FBX 文件选择 input（accept=".fbx"）
- 集成 FBXImportDialog 和进度对话框

### 任务 1.7：后端允许 FBX 文件类型
- [ ] 检查并修改 `packages/server/src/middleware/upload.ts`
- 允许 `application/octet-stream`（FBX）和 `model/gltf-binary`（GLB）

### 任务 1.8：Models 面板过滤
- [ ] 修改 `packages/client/src/components/panels/ProjectPanel.tsx`
- 在 `models` 文件夹视图中，过滤掉 `metadata.isSourceFbx === true` 的资产
- 保留现有上传按钮（用于直接上传 GLB/GLTF）

---

## Phase 2：Inspector 重新导入

**目标：** 点击 Models 面板中的 GLB 资产，Inspector 显示导入设置，支持修改后重新导入。

### 任务 2.1：资产选中状态
- [ ] 检查现有 `editorStore` 或 `assetStore` 是否有「选中资产 ID」的状态
- 如需新增：在 `assetStore` 中添加 `selectedAssetId` 字段和 `selectAsset(id)` 方法

### 任务 2.2：ProjectPanel 点击选中
- [ ] 修改 `packages/client/src/components/panels/ProjectPanel.tsx`
- 点击资产卡片时调用 `assetStore.selectAsset(assetId)`（区别于双击「打开」）

### 任务 2.3：ModelImportProp 组件
- [ ] 新建 `packages/client/src/components/inspector/ModelImportProp.tsx`
- 显示来源文件名（从 `metadata.originalName` 读取）
- 展示可编辑的导入设置表单
- 「设置已修改」指示器（对比当前值与 metadata 中存储的值）
- 「重新导入」按钮，触发重新转换流程

### 任务 2.4：InspectorPanel 集成
- [ ] 修改 `packages/client/src/components/panels/InspectorPanel.tsx`
- 当 `selectedAssetId` 对应的资产是 model 类型且有 `sourceFbxAssetId` 时
- 在 Inspector 底部渲染 `ModelImportProp`

### 任务 2.5：重新导入功能
- [ ] 在 `FBXImporter.ts` 中添加 `reimport(glbAsset, newSettings, projectId, onProgress)` 方法
- 下载原始 FBX（GET `/api/assets/:id/download`）
- Worker 重新转换
- 删除旧 GLB → 上传新 GLB（保持 sourceFbxAssetId 关联）

---

## Phase 3：优化与细节

**目标：** 提升用户体验，完善错误恢复。

### 任务 3.1：进度对话框优化
- [ ] 将进度对话框改为分阶段显示（解析中 / 转换中 / 上传中）
- 添加「取消」按钮支持

### 任务 3.2：错误恢复
- [ ] FBX 上传成功但 GLB 上传失败时，提示重试
- [ ] Inspector 中检测 FBX 源文件是否仍然存在

### 任务 3.3：文件大小警告
- [ ] 文件 > 100MB 时，在导入对话框顶部显示警告「大文件可能导致导入较慢」

### 任务 3.4：多文件导入支持（可选）
- 如需求中有批量导入需求，可扩展支持同时选择多个 FBX 文件

---

## 依赖关系图

```
1.1 (types)
  ↓
1.2 (fflate验证)
  ↓
1.3 (Worker)  ←→  1.4 (Dialog)
  ↓                   ↓
1.5 (Importer)←───────┘
  ↓
1.6 (Header)  +  1.7 (后端)  +  1.8 (面板过滤)
  ↓
Phase 1 完成
  ↓
2.1 (状态管理)
  ↓
2.2 + 2.3 + 2.4 并行
  ↓
2.5 (重新导入)
  ↓
Phase 2 完成
  ↓
Phase 3 优化
```

---

## 实施注意事项

1. **Worker 路径**：Vite 中使用 `new URL('./fbxWorker.ts', import.meta.url)` 确保路径正确
2. **ArrayBuffer 转移**：`postMessage(data, [fbxBuffer])` 中的第二个参数可转移所有权（避免复制）
3. **上传中止**：如需支持取消，需要在 API 请求中使用 `AbortController`
4. **fflate 确认**：Three.js r173 的 FBXLoader 内部通过相对路径引用 `../libs/fflate.module.js`，Vite 会自动打包，无需单独安装
5. **测试**：Phase 1 完成后，用小型 FBX 文件（< 5MB）验证完整流程，再测试大文件
