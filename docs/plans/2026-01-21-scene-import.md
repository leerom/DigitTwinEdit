# 场景导入功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 实现场景导入功能,允许用户从JSON文件加载完整的三维场景,包括对象结构、渲染配置和相机设置。

**架构:**
- 创建 `SceneImporter` 服务处理JSON解析和格式转换
- 扩展 `sceneStore` 和 `editorStore` 管理导入状态和进度
- 实现自定义UI组件(菜单、对话框)处理用户交互
- 采用分阶段加载策略(解析 -> 转换 -> 加载)优化性能

**技术栈:** React, TypeScript, Zustand, Three.js, TailwindCSS

---

### Task 1: 基础设施与UI组件

**Files:**
- Create: `src/components/common/Dialog.tsx`
- Create: `src/components/common/DropdownMenu.tsx`
- Create: `src/features/scene/components/ConfirmDialog.tsx`
- Create: `src/features/scene/components/ProgressDialog.tsx`
- Test: `src/components/common/Dialog.test.tsx`

**Step 1: 创建基础Dialog组件**
- 实现模态遮罩和居中容器
- 支持点击遮罩关闭(可选)
- 样式匹配现有Input组件风格(深色主题)

**Step 2: 创建DropdownMenu组件**
- 实现无依赖的下拉菜单
- 支持trigger和menu items
- 处理点击外部关闭

**Step 3: 实现业务对话框**
- `ConfirmDialog`: 警告图标, 确认/取消按钮
- `ProgressDialog`: 进度条, 百分比, 任务描述文本
- 进度条动画效果

**Step 4: 编写组件测试**
- 验证显示/隐藏逻辑
- 验证回调触发

### Task 2: 场景格式转换器

**Files:**
- Create: `src/features/scene/services/SceneFormatConverter.ts`
- Create: `src/features/scene/types.ts`
- Test: `src/features/scene/services/SceneFormatConverter.test.tsx`

**Step 1: 定义外部场景类型**
- 在 `types.ts` 中定义 `ExternalSceneFile`, `ViewerConfig` 等接口
- 确保覆盖示例JSON的所有关键字段

**Step 2: 实现对象转换逻辑**
- 将对象数组转换为 Record 结构
- 生成UUID
- 转换 `userData.fileInfo` 为组件数据
- 处理 `locked` 状态映射

**Step 3: 实现配置转换逻辑**
- `viewer` -> `settings` + `metadata`
- `camera` -> `metadata` (供后续使用)

**Step 4: 编写单元测试**
- 使用模拟的外部JSON数据
- 验证生成的内部Scene对象结构正确
- 验证ID生成和层级关系

### Task 3: Store扩展与状态管理

**Files:**
- Modify: `src/stores/sceneStore.ts`
- Test: `src/stores/sceneStore.test.ts`

**Step 1: 扩展SceneState接口**
- 添加 `importProgress` 状态: `isImporting`, `percentage`, `currentTask`
- 添加 `importErrors` 数组

**Step 2: 实现Actions**
- `setImportProgress(progress)`
- `addImportError(error)`
- `clearImportState()`

**Step 3: 编写Store测试**
- 验证状态更新逻辑
- 确保与immer中间件兼容

### Task 4: 场景加载服务集成

**Files:**
- Create: `src/features/scene/services/SceneLoader.ts`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/App.tsx` (注入全局对话框)

**Step 1: 实现SceneLoader服务**
- `loadSceneFile(file: File)`: 读取并解析文件
- `convertAndLoad(content: string)`: 调用转换器并更新Store
- 进度管理逻辑: 分配各阶段进度值

**Step 2: 集成到Header组件**
- 将"文件"按钮改为"场景"下拉菜单
- 实现文件选择input (hidden)
- 连接 `importScene` 逻辑

**Step 3: 全局对话框集成**
- 在App或MainLayout层级添加 `ProgressDialog` 和 `ConfirmDialog`
- 连接Store中的导入状态控制显示

### Task 5: 3D模型异步加载与应用

**Files:**
- Create: `src/features/scene/services/ModelLoader.ts`
- Modify: `src/components/viewport/SceneView.tsx`

**Step 1: 实现ModelLoader**
- 检查对象类型, 决定加载策略
- 处理 GLB/GLTF 加载 (使用 `GLTFLoader`)
- 处理 3DTILES (创建占位符, 记录警告)

**Step 2: 实现配置应用逻辑**
- 创建 hook `useSceneConfig(scene)`
- 在 SceneView 中调用, 应用背景、环境光、相机位置
- 使用 `editorStore.setCamera` 更新相机

**Step 3: 完善错误处理**
- 捕获加载错误
- 生成错误报告

### Task 6: Hierarchy面板增强

**Files:**
- Modify: `src/components/panels/HierarchyPanel.tsx`
- Modify: `src/components/panels/hierarchy/HierarchyItem.tsx`

**Step 1: 添加锁定图标**
- 在Item渲染中检查 `object.locked`
- 显示 `Lock` 图标 (Lucide React)

**Step 2: 处理锁定交互**
- 锁定对象样式变灰
- 阻止拖拽和重命名操作(如果需要)

**Step 3: 验证**
- 导入包含锁定对象的场景
- 确认图标显示正确

---
