# 场景导入功能设计文档

**创建日期:** 2026-01-21
**功能版本:** v1.0
**状态:** 设计完成,待实现

---

## 1. 功能概述

### 1.1 功能目标
为数字孪生三维场景编辑器添加场景导入功能,允许用户从JSON格式的场景描述文件中加载完整的三维场景,包括场景对象、渲染配置、相机设置等。

### 1.2 核心用户流程

1. **触发导入**
   - 用户点击顶部菜单栏"场景"(原"文件")→"导入"
   - 打开系统文件选择对话框,筛选器设置为 `.scene.json` 文件

2. **确认替换**
   - 用户选择场景文件后,弹出确认对话框
   - 提示内容:"导入新场景将完全替换当前场景内容,是否继续?"
   - 用户可选择"确认"或"取消"

3. **加载过程**
   - 显示详细进度条模态框
   - 实时显示:加载百分比 + 当前操作描述
   - 示例:"加载中... 35% - 正在加载两江影视城站主体结构"

4. **导入完成**
   - 场景对象结构立即显示在Hierarchy面板
   - 3D模型异步加载并逐步渲染到Scene View
   - 应用场景的渲染配置和相机视角
   - 锁定对象在Hierarchy中显示锁定图标🔒

5. **错误处理**
   - 部分失败策略:成功的对象正常显示,失败的对象显示占位符
   - 错误详情记录到浏览器控制台
   - 完成后在UI中显示简要错误摘要(如"3/15个对象加载失败")

### 1.3 关键设计决策

| 决策点 | 选择方案 | 理由 |
|--------|---------|------|
| 场景替换方式 | 用户确认后完全替换 | 避免误操作丢失当前工作 |
| 模型加载策略 | 延迟异步加载 | 快速构建结构,模型逐步显示,提升响应速度 |
| 配置应用范围 | 完全应用所有配置 | 完整还原场景的视觉效果和视角 |
| 进度反馈 | 详细进度条+当前任务 | 提供明确的加载状态,增强用户体验 |
| 锁定对象处理 | 保持锁定+可视化标识 | 尊重场景设计意图,同时允许后续解锁 |
| 错误处理策略 | 部分成功+占位符 | 最大化导入成功率,不因个别失败中止整体 |

---

## 2. UI界面改造

### 2.1 菜单栏改造 (Header组件)

**当前状态:**
- 菜单项:"文件"、"编辑"、"资产"等静态按钮

**改造后:**
- 将"文件"改为"场景"
- 实现下拉菜单功能,包含以下菜单项:
  - 新建场景 (New Scene)
  - 删除场景 (Delete Scene) - 清空当前场景
  - 导入场景 (Import Scene) - 触发文件选择
  - 导出场景 (Export Scene) - 保存当前场景为JSON

**技术实现:**
- 使用 headlessui 的 Menu 组件或自定义下拉菜单
- 菜单项点击触发对应的场景操作函数
- 保持现有的TailwindCSS深色主题风格

### 2.2 确认对话框组件 (ConfirmDialog)

**视觉设计:**
- 模态遮罩层(半透明黑色背景)
- 居中卡片式对话框
- 包含:警告图标、提示文本、确认/取消按钮

**交互逻辑:**
- 显示时禁用背景交互
- ESC键或点击遮罩层关闭对话框(取消操作)
- 确认按钮:主要色调(primary),执行导入
- 取消按钮:次要色调(secondary),关闭对话框

### 2.3 进度条对话框组件 (ProgressDialog)

**显示内容:**
- 进度条(0-100%)
- 百分比数字显示
- 当前操作描述(动态更新)
- 示例:"加载中... 45% - 正在加载两江影视城站公共区装修"

**状态管理:**
- 支持更新进度百分比
- 支持更新当前操作描述文本
- 导入完成后自动关闭(延迟500ms让用户看到100%)

### 2.4 Hierarchy面板增强

**锁定对象标识:**
- 在对象名称前显示🔒图标(或使用Material Icons的lock图标)
- 锁定对象文本颜色略微变浅,表示不可编辑状态
- 鼠标悬停提示:"此对象已锁定,点击解锁后可编辑"

---

## 3. 数据模型与场景文件结构

### 3.1 场景文件JSON结构

基于 `rawRequirements/SceneDatas/两江影视城站.scene.json` 文件,场景文件包含以下主要部分:

```typescript
interface SceneFile {
  viewer: ViewerConfig;      // 渲染器配置
  editor: EditorConfig;      // 编辑器配置(可能为空)
  scene: SceneMetadata;      // 场景元数据
  camera: CameraConfig;      // 相机配置
  lights: LightConfig[];     // 光源数组
  objects: SceneObject[];    // 场景对象数组
}
```

### 3.2 关键数据结构定义

**ViewerConfig - 渲染器配置:**
```typescript
interface ViewerConfig {
  outputColorSpace: string;           // 色彩空间
  toneMapping: number;                // 色调映射类型
  toneMappingExposure: number;        // 曝光度
  background: string;                 // 背景颜色
  backgroundParams: BackgroundParams; // 背景参数
  environment: string;                // 环境贴图路径
  environmentParams: EnvironmentParams;
  postProcessor: PostProcessorConfig; // 后处理效果
}
```

**CameraConfig - 相机配置:**
```typescript
interface CameraConfig {
  position: [number, number, number];    // 相机位置
  rotation: [number, number, number, string]; // 旋转(欧拉角)
  quaternion: [number, number, number, number]; // 四元数
  spherical: [number, number, number];   // 球坐标
  target: [number, number, number];      // 观察目标点
}
```

**SceneObject - 场景对象:**
```typescript
interface SceneObject {
  name: string;                          // 对象名称
  type: string;                          // 对象类型(3DTILES, MESH, GROUP等)
  position: [number, number, number];    // 位置
  rotation: [number, number, number, string]; // 旋转
  scale: [number, number, number];       // 缩放
  visible: boolean;                      // 可见性
  userData: {
    locked?: boolean;                    // 锁定状态
    fileInfo?: {
      type: string;                      // 文件类型
      url: string;                       // 模型文件路径
    };
    [key: string]: any;                  // 其他自定义数据
  };
  children?: SceneObject[];              // 子对象(支持层级结构)
}
```

### 3.3 内部状态管理

需要在编辑器的状态管理(Store)中添加:

```typescript
interface SceneState {
  currentSceneFile?: string;             // 当前场景文件路径
  sceneMetadata?: SceneMetadata;         // 场景元数据
  loadingProgress: {
    isLoading: boolean;                  // 是否正在加载
    percentage: number;                  // 0-100
    currentTask: string;                 // 当前任务描述
  };
  loadErrors: Array<{                    // 加载错误列表
    objectName: string;
    error: string;
  }>;
}
```

---

## 4. 核心功能架构

### 4.1 场景加载器服务 (SceneLoader)

**职责:**
- 解析场景JSON文件
- 验证文件格式
- 协调加载流程
- 管理加载进度

**核心方法:**
```typescript
class SceneLoader {
  // 加载场景文件
  async loadScene(file: File): Promise<LoadResult>

  // 解析JSON并验证格式
  private parseSceneFile(content: string): SceneFile

  // 应用渲染器配置
  private applyViewerConfig(config: ViewerConfig): void

  // 应用相机配置
  private applyCameraConfig(config: CameraConfig): void

  // 创建场景对象层级结构
  private createSceneHierarchy(objects: SceneObject[]): void

  // 异步加载3D模型
  private async loadObjectModels(objects: SceneObject[]): Promise<void>
}
```

### 4.2 模型加载器 (ModelLoader)

**职责:**
- 根据 fileInfo 加载不同类型的3D模型
- 支持3DTILES、GLB/GLTF、FBX等格式
- 处理加载失败,创建占位符对象

**核心方法:**
```typescript
class ModelLoader {
  // 加载单个模型
  async loadModel(
    object: SceneObject,
    onProgress?: (progress: number) => void
  ): Promise<THREE.Object3D | null>

  // 根据类型选择加载器
  private getLoaderForType(type: string): Loader

  // 创建加载失败的占位符
  private createPlaceholder(object: SceneObject): THREE.Object3D
}
```

### 4.3 加载流程编排

**分阶段加载策略:**

**阶段1: 文件解析 (0-10%)**
- 读取文件内容
- 解析JSON
- 验证必需字段

**阶段2: 配置应用 (10-20%)**
- 应用渲染器配置
- 应用相机配置
- 应用光照配置

**阶段3: 对象结构创建 (20-30%)**
- 清空当前场景
- 创建对象层级树
- 在Hierarchy中显示对象列表
- 设置锁定状态

**阶段4: 模型异步加载 (30-100%)**
- 逐个加载3D模型文件
- 每个模型占用剩余进度的平均份额
- 加载完成后添加到场景中
- 更新进度显示当前加载对象名称

**错误处理:**
- 阶段1失败:中止导入,显示错误对话框
- 阶段2-3失败:尝试继续,记录错误
- 阶段4失败:单个模型失败不影响其他,使用占位符替代

### 4.4 与现有系统集成

**需要对接的Store:**
- `sceneStore`: 场景对象管理
- `cameraStore`: 相机状态管理
- `renderModeStore`: 渲染模式管理
- `selectionStore`: 选择状态(导入后清空选择)

**需要对接的Manager:**
- `SceneRenderer`: 场景渲染器
- `RenderModeManager`: 渲染模式管理器

---

## 5. 实现细节与技术要点

### 5.1 文件选择实现

**使用HTML5 File API:**
```typescript
// 创建隐藏的文件输入元素
const input = document.createElement('input');
input.type = 'file';
input.accept = '.scene.json,application/json';
input.onchange = (e) => handleFileSelected(e);
input.click();
```

**文件读取:**
```typescript
const reader = new FileReader();
reader.onload = (e) => {
  const content = e.target?.result as string;
  parseAndLoadScene(content);
};
reader.readAsText(file);
```

### 5.2 3DTILES加载特殊处理

**场景文件中大量使用3DTILES格式:**
- 需要集成 `3d-tiles-renderer` 或类似库
- URL路径可能是相对路径或绝对路径,需要处理
- 示例URL: `/3001/file/vfs/three-3dtiles/...`

**处理策略:**
- 检查是否已有3DTILES加载器集成
- 如无,使用简单的GLTF加载器作为fallback
- 对于加载失败的3DTILES,显示边界框占位符

### 5.3 占位符对象设计

**加载失败时的可视化表示:**
```typescript
function createPlaceholder(object: SceneObject): THREE.Object3D {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff6b6b,
    wireframe: true,
    opacity: 0.5,
    transparent: true
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = object.name + ' (加载失败)';
  return mesh;
}
```

### 5.4 进度计算逻辑

**总进度分配:**
- 文件解析: 10%
- 配置应用: 10%
- 结构创建: 10%
- 模型加载: 70% (平均分配给每个对象)

**示例计算:**
```typescript
const baseProgress = 30; // 前三阶段完成
const modelCount = objects.length;
const progressPerModel = 70 / modelCount;

objects.forEach((obj, index) => {
  const currentProgress = baseProgress + (index * progressPerModel);
  updateProgress(currentProgress, `正在加载${obj.name}`);
  await loadModel(obj);
});
```

### 5.5 渲染配置映射

**Three.js配置对应关系:**
```typescript
// 色彩空间
renderer.outputColorSpace = config.outputColorSpace;

// 色调映射
renderer.toneMapping = config.toneMapping; // 4 对应 ACESFilmicToneMapping

// 曝光度
renderer.toneMappingExposure = config.toneMappingExposure;

// 背景
scene.background = new THREE.Color(config.background);

// 环境贴图
const hdrLoader = new RGBELoader();
const envMap = await hdrLoader.loadAsync(config.environment);
scene.environment = envMap;
```

### 5.6 错误边界与降级策略

**关键错误处理点:**
- JSON解析失败 → 显示"文件格式错误"
- 必需字段缺失 → 使用默认值或跳过
- 模型URL无效 → 创建占位符
- 网络请求失败 → 重试3次后使用占位符
- 环境贴图加载失败 → 使用纯色背景

**用户友好的错误提示:**
```typescript
{
  title: "场景导入完成(部分失败)",
  message: "已成功导入12/15个对象,3个对象加载失败",
  details: [
    "两江影视城站附属结构: 模型文件未找到",
    "照明设备: 网络请求超时",
    "导向标识: 不支持的文件格式"
  ]
}
```

### 5.7 性能优化考虑

**大场景优化:**
- 使用 `requestAnimationFrame` 分批创建对象,避免阻塞UI
- 模型加载使用并发控制,同时最多加载3-5个模型
- LOD(细节层次)支持,远处对象使用低精度模型
- 视锥剔除,只渲染可见对象

---

## 6. 测试策略与后续扩展

### 6.1 测试用例设计

**单元测试:**
- SceneLoader.parseSceneFile() - 测试JSON解析和验证
- ModelLoader.getLoaderForType() - 测试加载器选择逻辑
- 进度计算函数 - 验证进度百分比计算正确性
- 占位符创建 - 验证失败对象的可视化

**集成测试:**
- 完整导入流程 - 使用示例场景文件测试端到端流程
- 错误恢复 - 模拟各种错误情况验证降级策略
- UI交互 - 测试菜单、对话框、进度显示的用户交互

**E2E测试(Playwright):**
```typescript
test('场景导入完整流程', async ({ page }) => {
  // 点击场景菜单
  await page.click('text=场景');
  // 点击导入
  await page.click('text=导入场景');
  // 选择文件(模拟)
  await page.setInputFiles('input[type=file]', 'test-scene.json');
  // 确认替换
  await page.click('button:has-text("确认")');
  // 等待加载完成
  await page.waitForSelector('text=加载完成');
  // 验证对象出现在Hierarchy
  await expect(page.locator('.hierarchy-item')).toHaveCount(15);
});
```

### 6.2 后续功能扩展点

**短期扩展 (与导入相关):**
- **场景导出功能** - 将当前编辑器状态保存为scene.json
- **场景新建功能** - 创建空白场景或从模板创建
- **场景删除功能** - 清空当前场景,恢复默认状态
- **最近打开列表** - 记录最近导入的场景文件,快速重新打开

**中期扩展 (增强导入体验):**
- **场景预览** - 选择文件后显示场景缩略图和基本信息再导入
- **批量导入** - 支持同时导入多个场景文件
- **导入选项** - 让用户自定义导入行为(是否应用相机、是否锁定对象等)
- **撤销导入** - 支持Ctrl+Z撤销场景导入操作

**长期扩展 (高级功能):**
- **增量导入** - 支持导入场景的部分对象(不替换整个场景)
- **场景合并工具** - 可视化界面选择要保留的对象
- **云端场景库** - 从服务器浏览和下载预制场景
- **场景版本管理** - 保存场景的多个版本,支持版本对比和回滚

### 6.3 文档与开发指南

**需要创建的文档:**
- API文档 - SceneLoader和ModelLoader的接口说明
- 场景文件格式规范 - scene.json的完整字段定义
- 用户使用手册 - 如何导入、导出、管理场景
- 故障排除指南 - 常见导入问题及解决方案

### 6.4 开发检查清单

**实现前准备:**
- [ ] 确认Three.js版本兼容性
- [ ] 选择3DTILES加载库(或决定暂不支持)
- [ ] 设计UI组件的视觉规范(与现有风格一致)
- [ ] 确定Store结构变更

**实现阶段:**
- [ ] 创建SceneLoader服务
- [ ] 创建ModelLoader服务
- [ ] 实现UI组件(菜单、对话框、进度条)
- [ ] 集成到Header和主应用
- [ ] 实现错误处理和占位符
- [ ] 添加锁定状态可视化

**测试与优化:**
- [ ] 编写单元测试
- [ ] 编写E2E测试
- [ ] 使用大场景文件测试性能
- [ ] 优化加载速度和内存使用
- [ ] 用户验收测试

**发布准备:**
- [ ] 更新用户文档
- [ ] 准备发布说明
- [ ] 进行回归测试
- [ ] Code Review

---

## 7. 附录

### 7.1 参考文件
- `rawRequirements/SceneDatas/两江影视城站.scene.json` - 场景文件示例(5638行)
- `src/components/layout/Header.tsx` - 当前菜单栏实现
- `CLAUDE.md` - 项目架构和技术栈说明

### 7.2 技术栈
- **前端框架:** React + TypeScript
- **3D引擎:** Three.js
- **UI框架:** TailwindCSS
- **状态管理:** Zustand (推测,需确认)
- **测试框架:** Playwright (E2E), Vitest (单元测试)

### 7.3 关键依赖
- `three` - 3D渲染引擎
- `@react-three/fiber` - React Three.js集成 (如果使用)
- `3d-tiles-renderer` - 3DTILES格式支持 (待确认)
- `headlessui` - 无样式UI组件库 (可选)

---

**文档结束**
