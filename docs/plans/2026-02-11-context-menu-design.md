# Content Grid 右键菜单功能设计

## 概述

为 ProjectPanel 的 Content Grid 区域中的场景卡片和资产卡片添加右键菜单功能，支持打开、重命名、删除操作。

**设计日期**: 2026-02-11

## 需求

1. 用户在对象（场景/资产卡片）上右键点击时，显示上下文菜单
2. 右键菜单包含三个操作：
   - **打开**: 场景激活该场景；资产在场景中央实例化
   - **重命名**: 内联编辑方式修改名称
   - **删除**: 删除场景或资产

## 架构设计

### 组件结构

**新增组件**:

1. **`ContextMenu`** (`components/common/ContextMenu.tsx`)
   - 通用右键菜单组件，可在项目其他地方复用
   - 负责菜单定位、显示/隐藏逻辑
   - 处理点击外部关闭和键盘事件

2. **`SceneCard`** (`components/panels/SceneCard.tsx`)
   - 从 ProjectPanel 中提取的场景卡片组件
   - 管理自身的重命名状态
   - 集成右键菜单功能

**修改组件**:

1. **`AssetCard`** (`components/assets/AssetCard.tsx`)
   - 添加右键菜单支持
   - 添加重命名状态管理
   - 保持现有拖拽功能

2. **`ProjectPanel`** (`components/panels/ProjectPanel.tsx`)
   - 使用新的 SceneCard 组件
   - 传递所有必要的回调函数
   - 实现业务逻辑

### 数据流

```
用户右键点击
  ↓
卡片组件捕获 onContextMenu 事件
  ↓
显示 ContextMenu（位置：鼠标坐标）
  ↓
用户点击菜单项
  ↓
调用对应回调函数（由 ProjectPanel 传入）
  ↓
执行操作（激活场景/实例化资产/重命名/删除）
  ↓
更新 Store 和后端数据
```

## 详细设计

### 1. ContextMenu 组件

#### 接口定义

```typescript
interface ContextMenuItem {
  label: string;              // 菜单项文字
  icon?: string;              // Material Symbols 图标名称
  onClick: () => void;        // 点击回调
  disabled?: boolean;         // 是否禁用
  danger?: boolean;           // 危险操作（红色高亮）
  divider?: boolean;          // 在此项后显示分割线
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}
```

#### 核心功能

**定位逻辑**:
- 使用 `position: fixed` 在鼠标位置显示
- 边界检测：如果菜单超出视口右侧/底部，则向左/上调整
- 计算逻辑：
  ```typescript
  const adjustedX = x + menuWidth > window.innerWidth
    ? window.innerWidth - menuWidth - 8
    : x;
  const adjustedY = y + menuHeight > window.innerHeight
    ? window.innerHeight - menuHeight - 8
    : y;
  ```

**关闭机制**:
- 点击菜单项后自动关闭
- 点击菜单外部关闭（监听 `mousedown` 事件）
- 按 ESC 键关闭（监听 `keydown` 事件）

**UI 样式**:
- 背景：`bg-slate-800`，边框：`border border-slate-700`
- 圆角：`rounded-md`，阴影：`shadow-lg`
- 菜单项高度：`py-2 px-3`，字体：`text-sm`
- 悬停效果：`hover:bg-slate-700`
- 删除项：`text-red-400 hover:text-red-300`

### 2. SceneCard 组件

#### Props 定义

```typescript
interface SceneCardProps {
  scene: Scene;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;              // 激活场景
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}
```

#### 状态管理

```typescript
const [isRenaming, setIsRenaming] = useState(false);
const [editedName, setEditedName] = useState(scene.name);
const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);
```

#### 重命名流程

1. 用户点击"重命名"菜单项
2. `isRenaming` 设为 `true`，名称文字替换为 `<input>` 元素
3. 输入框自动聚焦，选中全部文本
4. 用户编辑：
   - 按 Enter → 保存（调用 `onRename`）
   - 按 ESC → 取消（恢复原名称）
   - 失去焦点 → 保存
5. 保存后 `isRenaming` 设为 `false`

#### UI 特性

- 显示场景缩略图占位符（Material Icons: `photo_library`）
- 活动场景显示"活动场景"标签（`text-primary`）
- 10 列网格布局，每个卡片 `aspect-square`

### 3. AssetCard 组件修改

#### 新增 Props

```typescript
interface AssetCardProps {
  // ... 现有 props
  onOpen?: () => void;              // 在场景中实例化资产
  onRename?: (newName: string) => void;
}
```

#### 新增状态

```typescript
const [isRenaming, setIsRenaming] = useState(false);
const [editedName, setEditedName] = useState(asset.name);
const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);
```

#### 功能整合

- 保持现有的拖拽功能（`draggable` 和 `onDragStart`）
- 重命名功能与 SceneCard 相同
- 移除右上角的删除按钮（改为右键菜单中的"删除"项）

### 4. ProjectPanel 集成

#### 场景操作回调

```typescript
const handleSceneOpen = async (sceneId: number) => {
  if (!currentProject) return;
  try {
    await projectStore.activateScene(currentProject.id, sceneId);
  } catch (error) {
    console.error('Failed to activate scene:', error);
    // TODO: 显示错误提示
  }
};

const handleSceneRename = async (sceneId: number, newName: string) => {
  const error = validateName(newName);
  if (error) {
    // TODO: 显示验证错误
    return;
  }
  try {
    await projectStore.updateScene(sceneId, { name: newName });
  } catch (error) {
    console.error('Failed to rename scene:', error);
    // TODO: 显示错误提示
  }
};

const handleSceneDelete = async (sceneId: number) => {
  const scene = scenes.find(s => s.id === sceneId);
  if (scene?.is_active) {
    alert('无法删除活动场景，请先切换到其他场景');
    return;
  }
  if (!confirm('确定要删除这个场景吗？')) return;

  try {
    await projectStore.deleteScene(sceneId);
  } catch (error) {
    console.error('Failed to delete scene:', error);
    // TODO: 显示错误提示
  }
};
```

#### 资产操作回调

```typescript
const handleAssetOpen = async (assetId: number) => {
  try {
    // 在场景中央实例化资产
    await sceneStore.addAssetToScene(assetId);
  } catch (error) {
    console.error('Failed to add asset to scene:', error);
    // TODO: 显示错误提示
  }
};

const handleAssetRename = async (assetId: number, newName: string) => {
  const error = validateName(newName);
  if (error) {
    // TODO: 显示验证错误
    return;
  }
  try {
    await assetStore.updateAsset(assetId, { name: newName });
  } catch (error) {
    console.error('Failed to rename asset:', error);
    // TODO: 显示错误提示
  }
};
```

### 5. Store 扩展

#### projectStore 新增方法

```typescript
// 激活场景
activateScene: async (projectId: number, sceneId: number) => {
  const response = await api.put(
    `/projects/${projectId}/scenes/${sceneId}/activate`
  );
  set((state) => ({
    scenes: state.scenes.map(s => ({
      ...s,
      is_active: s.id === sceneId
    })),
    currentScene: response.data
  }));
}

// 更新场景信息
updateScene: async (sceneId: number, data: Partial<Scene>) => {
  const response = await api.put(`/scenes/${sceneId}`, data);
  set((state) => ({
    scenes: state.scenes.map(s =>
      s.id === sceneId ? { ...s, ...response.data } : s
    )
  }));
}
```

#### assetStore 新增方法

```typescript
// 更新资产信息
updateAsset: async (assetId: number, data: Partial<Asset>) => {
  const response = await api.put(`/assets/${assetId}`, data);
  set((state) => ({
    assets: state.assets.map(a =>
      a.id === assetId ? { ...a, ...response.data } : a
    )
  }));
}
```

#### sceneStore 新增方法

```typescript
// 在场景中央实例化资产
addAssetToScene: async (assetId: number) => {
  const asset = useAssetStore.getState().assets.find(a => a.id === assetId);
  if (!asset) throw new Error('Asset not found');

  // 根据资产类型创建对应的场景对象
  const newObject = createObjectFromAsset(asset);

  // 添加到场景中央 (0, 0, 0)
  set((state) => ({
    scene: {
      ...state.scene,
      objects: [...state.scene.objects, newObject]
    },
    isDirty: true
  }));
}
```

## 错误处理和边界情况

### 名称验证

```typescript
const validateName = (name: string): string | null => {
  if (!name.trim()) {
    return "名称不能为空";
  }
  if (name.length > 255) {
    return "名称过长（最多255字符）";
  }
  if (/[<>:"/\\|?*]/.test(name)) {
    return "名称包含非法字符";
  }
  return null;
};
```

### 边界情况

1. **删除活动场景**
   - 策略：阻止删除并提示
   - 提示："无法删除活动场景，请先切换到其他场景"

2. **重命名冲突**
   - 后端返回 409 Conflict
   - 前端提示："名称已存在，请使用其他名称"

3. **空项目状态**
   - 如果没有场景，"打开资产"需要先创建默认场景
   - 或提示用户："请先创建场景"

4. **API 错误处理**
   - 网络错误：显示通用错误提示
   - 权限错误 (403)：提示"没有权限执行此操作"
   - 其他错误：显示错误消息

## 实现步骤

1. 创建 `ContextMenu` 组件
2. 创建 `SceneCard` 组件
3. 修改 `AssetCard` 组件
4. 扩展 Store 方法（projectStore, assetStore, sceneStore）
5. 修改 `ProjectPanel` 集成所有功能
6. 测试各种场景和边界情况

## 后端 API 需求

确认以下 API 端点存在：

- `PUT /api/projects/:projectId/scenes/:sceneId/activate` - 激活场景
- `PUT /api/projects/:projectId/scenes/:sceneId` - 更新场景信息
- `PUT /api/assets/:id` - 更新资产信息

## UI/UX 细节

- 右键菜单最小宽度：`min-w-[160px]`
- 菜单项图标大小：`text-base`
- 菜单项间距：`space-x-2`
- 重命名输入框样式：
  - 背景：`bg-slate-700`
  - 边框：`border-2 border-primary`
  - 自动聚焦并选中全部文本
  - 字体大小与原文字一致
- Loading 状态：操作时在卡片上显示半透明遮罩和 spinner

## 未来扩展

- 支持多选后批量操作
- 添加"复制"、"粘贴"功能
- 支持键盘快捷键（F2 重命名，Delete 删除等）
- 在其他面板（Hierarchy、Inspector）复用 ContextMenu
- 添加撤销/重做支持

---

**设计完成日期**: 2026-02-11
