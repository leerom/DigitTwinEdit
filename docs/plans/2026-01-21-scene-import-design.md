# 场景导入功能设计文档

**创建日期:** 2026-01-21
**更新日期:** 2026-01-21
**功能版本:** v1.0
**状态:** 设计完成,已完成技术调研

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

## 2. 技术调研结果 (2026-01-21)

### 2.1 技术栈确认

**前端框架:**
- ✅ React 19.0.0 + TypeScript 5.9.3
- ✅ Vite 7.3.1 (构建工具)
- ✅ TailwindCSS 4.1.18 (样式框架)

**3D渲染引擎:**
- ✅ Three.js 0.173.0
- ✅ @react-three/fiber 9.0.1 (React集成,声明式3D场景)
- ✅ @react-three/drei 10.1.3 (Three.js辅助工具库)

**状态管理:**
- ✅ Zustand 5.0.2 (轻量级状态管理)
- ✅ Immer 11.1.3 (不可变更新中间件)
- ✅ Zustand DevTools中间件已启用

**UI组件与工具:**
- ✅ Lucide React 0.562.0 (图标库)
- ✅ @dnd-kit/* (拖拽功能,用于Hierarchy面板)
- ✅ clsx 2.1.1 + tailwind-merge 3.4.0 (样式工具)
- ❌ 无headlessui或其他预制UI组件库 - **需要自定义对话框组件**

**测试框架:**
- ✅ Vitest 4.0.17 (单元测试)
- ✅ Playwright 1.57.0 (E2E测试)
- ✅ @testing-library/react 16.3.2

### 2.2 现有代码库分析

**Store结构:**

`sceneStore.ts` - 场景数据管理:
```typescript
interface SceneState {
  scene: Scene;
  addObject, removeObject, updateTransform, reparentObject, updateComponent;
  loadScene: (scene: Scene) => void; // ✅ 已存在,可直接用于场景导入
}
```

`editorStore.ts` - 编辑器状态:
```typescript
interface EditorState {
  mode: EditorMode;              // select/translate/rotate/scale
  renderMode: RenderMode;        // shaded/wireframe/hybrid
  selectedIds: string[];
  camera: CameraState;           // ✅ 可用于相机配置导入
  setCamera: (camera: Partial<CameraState>) => void;
}
```

**现有Scene类型定义** (`src/types/index.ts`):
```typescript
interface Scene {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  root: string;
  objects: Record<string, SceneObject>; // ⚠️ Record格式,非数组
  assets: Record<string, AssetReference>;
  settings: SceneSettings;
}

interface SceneObject {
  id, name, type, parentId, children: string[];
  visible: boolean;
  locked: boolean;              // ✅ 锁定功能已支持
  transform: TransformComponent;
  components?: {...};
}
```

**现有功能:**
- ✅ 场景导出 (`SceneExporter.ts`) - 可参考实现
- ✅ 对象递归渲染 (`SceneRenderer.tsx`)
- ✅ 锁定状态数据支持 - 需添加UI可视化

### 2.3 关键技术差异与适配需求

**⚠️ 场景文件格式差异:**

外部场景JSON (`rawRequirements/SceneDatas/*.scene.json`):
```json
{
  "viewer": {
    "outputColorSpace": "srgb-linear",
    "toneMapping": 4,
    "environment": "/path/to/hdr",
    "postProcessor": {...}
  },
  "camera": {
    "position": [x, y, z],
    "quaternion": [...],
    "target": [...]
  },
  "lights": [...],
  "objects": [  // ⚠️ 数组格式
    {
      "name": "对象名",
      "type": "3DTILES",
      "position": [...],
      "userData": {
        "locked": true,
        "fileInfo": {
          "type": "3DTILES",
          "url": "/path/to/tileset.json"
        }
      }
    }
  ]
}
```

内部Scene格式:
```typescript
{
  id, name, version, createdAt, updatedAt,
  root: "root",
  objects: {              // ⚠️ Record格式,非数组
    "uuid1": {...},
    "uuid2": {...}
  },
  assets: {...},
  settings: {
    environment: string,
    gridVisible: boolean,
    backgroundColor: string
  }
}
```

**需要创建格式转换器:**
1. ✅ 外部 `objects[]` → 内部 `objects: Record<id, SceneObject>`
2. ✅ 外部 `viewer` → 内部 `settings` + Three.js渲染器配置
3. ✅ 外部 `camera` → 内部 `editorStore.camera`
4. ✅ 外部 `userData.fileInfo` → 内部 `components.mesh` 或自定义组件
5. ✅ 生成UUID作为对象ID
6. ✅ 构建父子关系树结构

### 2.4 技术实现建议调整

**基于现有架构的优化:**

1. **利用现有Store方法:**
   - 使用 `sceneStore.loadScene()` 加载转换后的场景
   - 使用 `editorStore.setCamera()` 应用相机配置
   - 无需修改Store结构,只需添加渲染器配置应用逻辑

2. **自定义UI组件:**
   - 创建 `Dialog` 基础组件(模态遮罩 + 卡片容器)
   - 基于 `Dialog` 派生 `ConfirmDialog` 和 `ProgressDialog`
   - 创建 `DropdownMenu` 组件用于Header菜单
   - 使用现有 `Input` 组件模式,保持样式一致性

3. **3D模型加载策略:**
   - 暂不支持3DTILES格式(库未集成)
   - 优先支持GLB/GLTF格式(Three.js原生支持)
   - 对于3DTILES对象,创建占位符并记录警告
   - 后续可扩展 `3d-tiles-renderer` 集成

4. **渲染器配置应用:**
   - 通过 `useThree` hook访问Three.js渲染器实例
   - 在SceneView组件或专用服务中应用配置
   - 环境贴图使用 `@react-three/drei` 的 `<Environment>` 组件

---

## 3. UI界面改造

### 3.1 菜单栏改造 (Header组件)

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
- ✅ 自定义下拉菜单组件(无headlessui依赖)
- 使用React state管理菜单展开/收起状态
- 菜单项点击触发对应的场景操作函数
- 保持现有的TailwindCSS深色主题风格
- 参考 `Input.tsx` 的样式模式

### 3.2 确认对话框组件 (ConfirmDialog)

**视觉设计:**
- 模态遮罩层(半透明黑色背景)
- 居中卡片式对话框
- 包含:警告图标、提示文本、确认/取消按钮

**交互逻辑:**
- 显示时禁用背景交互
- ESC键或点击遮罩层关闭对话框(取消操作)
- 确认按钮:主要色调(primary),执行导入
- 取消按钮:次要色调(secondary),关闭对话框

### 3.3 进度条对话框组件 (ProgressDialog)

**显示内容:**
- 进度条(0-100%)
- 百分比数字显示
- 当前操作描述(动态更新)
- 示例:"加载中... 45% - 正在加载两江影视城站公共区装修"

**状态管理:**
- 支持更新进度百分比
- 支持更新当前操作描述文本
- 导入完成后自动关闭(延迟500ms让用户看到100%)

### 3.4 Hierarchy面板增强

**锁定对象标识:**
- 在对象名称前显示🔒图标(或使用Material Icons的lock图标)
- 锁定对象文本颜色略微变浅,表示不可编辑状态
- 鼠标悬停提示:"此对象已锁定,点击解锁后可编辑"

---

## 4. 场景格式转换器设计

### 4.1 转换器职责

将外部场景JSON格式转换为编辑器内部Scene格式,处理格式差异和数据映射。

**核心转换逻辑:**

```typescript
class SceneFormatConverter {
  /**
   * 转换外部场景JSON为内部Scene格式
   * @param externalScene 外部场景JSON对象
   * @returns 内部Scene对象
   */
  convert(externalScene: ExternalSceneFile): Scene {
    const sceneId = uuidv4();
    const rootId = 'root';

    // 1. 转换对象数组为Record,构建层级树
    const { objects, root } = this.convertObjects(
      externalScene.objects || [],
      rootId
    );

    // 2. 转换场景设置
    const settings = this.convertSettings(externalScene);

    // 3. 提取资产引用
    const assets = this.extractAssets(externalScene.objects || []);

    return {
      id: sceneId,
      name: externalScene.scene?.name || 'Imported Scene',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      root: rootId,
      objects,
      assets,
      settings,
      metadata: {
        // 保存原始viewer和camera配置供后续应用
        viewerConfig: externalScene.viewer,
        cameraConfig: externalScene.camera,
        lightsConfig: externalScene.lights,
      }
    };
  }
}
```

### 4.2 对象转换逻辑

```typescript
private convertObjects(
  externalObjects: ExternalSceneObject[],
  rootId: string
): { objects: Record<string, SceneObject>; root: string } {
  const objects: Record<string, SceneObject> = {};

  // 创建root对象
  objects[rootId] = {
    id: rootId,
    name: 'Root',
    type: ObjectType.GROUP,
    parentId: null,
    children: [],
    visible: true,
    locked: true,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  };

  // 转换每个外部对象
  externalObjects.forEach((extObj) => {
    const id = uuidv4();
    const sceneObj: SceneObject = {
      id,
      name: extObj.name || 'Unnamed',
      type: this.mapObjectType(extObj.type),
      parentId: rootId, // 暂时都挂到root下
      children: [],
      visible: extObj.visible !== false,
      locked: extObj.userData?.locked || false,
      transform: {
        position: extObj.position || [0, 0, 0],
        rotation: extObj.rotation
          ? [extObj.rotation[0], extObj.rotation[1], extObj.rotation[2]]
          : [0, 0, 0],
        scale: extObj.scale || [1, 1, 1],
      },
      components: this.convertComponents(extObj),
    };

    objects[id] = sceneObj;
    objects[rootId].children.push(id);
  });

  return { objects, root: rootId };
}

private mapObjectType(externalType: string): ObjectType {
  const typeMap: Record<string, ObjectType> = {
    '3DTILES': ObjectType.MESH,
    'MESH': ObjectType.MESH,
    'GROUP': ObjectType.GROUP,
    'LIGHT': ObjectType.LIGHT,
  };
  return typeMap[externalType] || ObjectType.MESH;
}

private convertComponents(extObj: ExternalSceneObject) {
  const components: any = {};

  // 转换fileInfo为模型组件
  if (extObj.userData?.fileInfo) {
    components.model = {
      type: extObj.userData.fileInfo.type,
      url: extObj.userData.fileInfo.url,
      loadState: 'pending', // pending | loading | loaded | error
    };
  }

  // 保留其他userData
  if (extObj.userData) {
    const { fileInfo, locked, ...otherData } = extObj.userData;
    if (Object.keys(otherData).length > 0) {
      components.metadata = otherData;
    }
  }

  return components;
}
```

### 4.3 设置转换逻辑

```typescript
private convertSettings(externalScene: ExternalSceneFile): SceneSettings {
  const viewer = externalScene.viewer || {};

  return {
    environment: viewer.environment || 'default',
    gridVisible: true, // 默认显示网格
    backgroundColor: viewer.background || '#1a1a1a',
    // 可扩展其他设置
  };
}
```

### 4.4 资产提取逻辑

```typescript
private extractAssets(
  externalObjects: ExternalSceneObject[]
): Record<string, AssetReference> {
  const assets: Record<string, AssetReference> = {};

  externalObjects.forEach((obj) => {
    if (obj.userData?.fileInfo?.url) {
      const assetId = uuidv4();
      assets[assetId] = {
        id: assetId,
        name: obj.name || 'Asset',
        type: AssetType.MODEL,
        path: obj.userData.fileInfo.url,
      };
    }
  });

  return assets;
}
```

### 4.5 外部类型定义

```typescript
interface ExternalSceneFile {
  viewer?: {
    outputColorSpace?: string;
    toneMapping?: number;
    toneMappingExposure?: number;
    background?: string;
    environment?: string;
    environmentParams?: any;
    postProcessor?: any;
  };
  camera?: {
    position: [number, number, number];
    rotation?: [number, number, number, string];
    quaternion?: [number, number, number, number];
    target?: [number, number, number];
  };
  scene?: {
    name?: string;
    userData?: any;
  };
  lights?: any[];
  objects?: ExternalSceneObject[];
}

interface ExternalSceneObject {
  name?: string;
  type?: string;
  position?: [number, number, number];
  rotation?: [number, number, number, string];
  scale?: [number, number, number];
  visible?: boolean;
  userData?: {
    locked?: boolean;
    fileInfo?: {
      type: string;
      url: string;
    };
    [key: string]: any;
  };
  children?: ExternalSceneObject[];
}
```

---

## 5. 数据模型与场景文件结构

### 5.1 场景文件JSON结构

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

### 5.2 关键数据结构定义

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

### 5.3 内部状态管理扩展

基于现有Store结构,需要添加场景导入相关状态:

```typescript
// 扩展 sceneStore.ts
interface SceneState {
  scene: Scene;
  // ... 现有方法

  // 新增:场景导入状态
  importProgress: {
    isImporting: boolean;
    percentage: number;
    currentTask: string;
  };
  importErrors: Array<{
    objectName: string;
    error: string;
  }>;

  // 新增:导入相关action
  setImportProgress: (progress: Partial<ImportProgress>) => void;
  addImportError: (error: ImportError) => void;
  clearImportState: () => void;
}
```

---

## 6. 核心功能架构

### 6.1 场景加载器服务 (SceneLoader)

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

### 6.2 模型加载器 (ModelLoader)

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

### 6.3 加载流程编排

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

### 6.4 与现有系统集成

**需要对接的Store:**
- ✅ `sceneStore`: 使用现有 `loadScene()` 方法
- ✅ `editorStore`: 使用现有 `setCamera()` 和 `clearSelection()` 方法

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

## 8. 测试策略与后续扩展

### 8.1 测试用例设计

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

### 8.2 后续功能扩展点

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

### 8.3 文档与开发指南

**需要创建的文档:**
- API文档 - SceneLoader和ModelLoader的接口说明
- 场景文件格式规范 - scene.json的完整字段定义
- 用户使用手册 - 如何导入、导出、管理场景
- 故障排除指南 - 常见导入问题及解决方案

### 8.4 开发检查清单

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

## 9. 附录

### 9.1 参考文件
- `rawRequirements/SceneDatas/两江影视城站.scene.json` - 场景文件示例(5638行)
- `src/components/layout/Header.tsx` - 当前菜单栏实现
- `src/stores/sceneStore.ts` - 场景数据Store
- `src/stores/editorStore.ts` - 编辑器状态Store
- `src/features/scene/SceneExporter.ts` - 场景导出参考
- `CLAUDE.md` - 项目架构和技术栈说明

### 9.2 技术栈 (已确认)
- **前端框架:** React 19.0.0 + TypeScript 5.9.3
- **构建工具:** Vite 7.3.1
- **3D引擎:** Three.js 0.173.0
- **3D React集成:** @react-three/fiber 9.0.1, @react-three/drei 10.1.3
- **UI框架:** TailwindCSS 4.1.18
- **状态管理:** Zustand 5.0.2 + Immer 11.1.3
- **测试框架:** Vitest 4.0.17 (单元测试), Playwright 1.57.0 (E2E测试)
- **图标库:** Lucide React 0.562.0

### 9.3 关键依赖与限制
**已集成:**
- ✅ `three` - 3D渲染引擎
- ✅ `@react-three/fiber` - React Three.js集成
- ✅ `@react-three/drei` - Three.js辅助工具
- ✅ `zustand` - 状态管理
- ✅ `uuid` - UUID生成

**未集成(需注意):**
- ❌ `3d-tiles-renderer` - 3DTILES格式支持(暂不支持)
- ❌ `headlessui` 或其他UI组件库(需自定义组件)

**技术限制:**
- 3DTILES格式暂时使用占位符,不加载真实模型
- 所有UI组件需自定义实现,参考现有Input组件风格

---

**文档结束**
