# 数据模型: 数字孪生三维场景编辑器

**分支**: `001-3d-scene-editor` | **日期**: 2026-01-20 | **状态**: 草稿

## 核心实体 (Entities)

### Scene (场景)
场景是所有对象的容器，对应一个 JSON 文件。

```typescript
interface Scene {
  id: string;               // 场景唯一标识 (UUID)
  name: string;             // 场景名称
  version: string;          // 文件版本号 (e.g., "1.0.0")
  createdAt: string;        // 创建时间 (ISO 8601)
  updatedAt: string;        // 最后修改时间 (ISO 8601)
  root: string;             // 根对象 ID (指向 SceneObject)
  objects: Record<string, SceneObject>; // 扁平化存储的所有对象字典
  assets: Record<string, AssetReference>; // 场景引用的资产列表
  settings: SceneSettings;  // 场景全局设置
}

interface SceneSettings {
  environment: string;      // 环境贴图 ID
  gridVisible: boolean;     // 网格是否可见
  backgroundColor: string;  // 背景颜色 (Hex)
}
```

### SceneObject (场景对象)
场景中的基本实体，组合了变换、层级和组件信息。

```typescript
interface SceneObject {
  id: string;               // 对象唯一标识 (UUID)
  name: string;             // 对象名称
  type: ObjectType;         // 对象类型
  parentId: string | null;  // 父对象 ID (null 表示根节点)
  children: string[];       // 子对象 ID 列表 (保持顺序)
  visible: boolean;         // 可见性
  locked: boolean;          // 是否锁定 (不可编辑)
  transform: TransformComponent; // 变换组件 (核心组件)
  components: ObjectComponents;  // 其他组件集合
}

enum ObjectType {
  GROUP = 'Group',          // 空分组
  MESH = 'Mesh',            // 3D 网格模型
  LIGHT = 'Light',          // 灯光
  CAMERA = 'Camera',        // 相机
  TWIN = 'Twin',            // 数字孪生体
}
```

### Components (组件)

#### TransformComponent (变换组件)
定义对象在 3D 空间中的位置、旋转和缩放。

```typescript
interface TransformComponent {
  position: Vector3;        // { x, y, z }
  rotation: Vector3;        // { x, y, z } (Euler angles in radians)
  scale: Vector3;           // { x, y, z }
}

type Vector3 = [number, number, number];
```

#### MeshComponent (网格组件)
定义对象的几何形状和材质引用。

```typescript
interface MeshComponent {
  assetId: string;          // 关联的几何体资产 ID
  materialId: string;       // 关联的材质资产 ID
  castShadow: boolean;      // 是否投射阴影
  receiveShadow: boolean;   // 是否接收阴影
}
```

#### TwinComponent (数字孪生组件)
关联外部实时数据源的元数据。

```typescript
interface TwinComponent {
  externalId: string;       // 外部系统关联 ID (e.g., "METRO-A1-42")
  dataSource: string;       // 数据源标识
  lastUpdate: number;       // 最后数据更新时间戳
  status: 'online' | 'offline' | 'error'; // 连接状态
  // 实时数据不持久化保存，仅在运行时存于内存 Store 中
}
```

### Assets (资产)
项目中的静态资源引用。

```typescript
interface AssetReference {
  id: string;               // 资产唯一标识
  name: string;             // 资产名称
  type: AssetType;          // 资产类型
  path: string;             // 文件路径 (相对路径)
  thumbnail?: string;       // 缩略图路径
}

enum AssetType {
  MODEL = 'model',          // .glb, .fbx
  MATERIAL = 'material',    // .mat (JSON)
  TEXTURE = 'texture',      // .png, .jpg
}
```

## 状态管理模型 (Zustand Stores)

### EditorStore (编辑器状态)
管理编辑器的 UI 状态和操作上下文。

```typescript
interface EditorState {
  // 模式
  mode: 'select' | 'translate' | 'rotate' | 'scale'; // 当前工具 (Q/W/E/R)
  renderMode: 'shaded' | 'wireframe' | 'hybrid';     // 渲染模式

  // 选择
  selectedIds: string[];    // 当前选中的对象 ID 列表
  activeId: string | null;  // 当前主选中对象 (用于 Inspector 显示)

  // 视图
  camera: CameraState;      // 相机状态 (位置/目标)

  // 操作
  setMode: (mode: EditorMode) => void;
  setRenderMode: (mode: RenderMode) => void;
  select: (ids: string[], append?: boolean) => void;
  deselect: (ids: string[]) => void;
  clearSelection: () => void;
}
```

### SceneStore (场景数据状态)
管理场景图数据，支持撤销/重做。

```typescript
interface SceneState {
  scene: Scene;             // 完整的场景数据树

  // 原子操作 (会被封装进 Command)
  addObject: (obj: SceneObject) => void;
  removeObject: (id: string) => void;
  updateTransform: (id: string, transform: Partial<TransformComponent>) => void;
  reparentObject: (id: string, newParentId: string, index?: number) => void;
  updateComponent: (id: string, componentKey: string, data: any) => void;
}
```

### HistoryStore (历史记录状态)
管理命令栈。

```typescript
interface HistoryState {
  past: Command[];          // 撤销栈
  future: Command[];        // 重做栈

  execute: (cmd: Command) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

interface Command {
  name: string;             // 命令名称 (e.g., "Move Object")
  execute: () => void;      // 执行逻辑
  undo: () => void;         // 撤销逻辑
  merge?: (next: Command) => boolean; // 合并逻辑
}
```

## 验证规则

1. **循环引用**: 对象不能作为自己或自己子孙节点的子节点。
2. **唯一性**: 同一层级下的对象名称建议唯一，ID 必须全局唯一。
3. **数据完整性**: 删除父节点时，子节点必须级联删除或解除父子关系（本项目策略：级联删除）。
4. **根节点**: 场景必须有且仅有一个根节点 (Root Group)。
