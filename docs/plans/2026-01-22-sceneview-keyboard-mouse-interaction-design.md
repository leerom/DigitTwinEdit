# SceneView 键盘鼠标交互系统设计文档

## 概述

本文档描述为数字孪生三维场景编辑器的 SceneView 组件增加完整的键盘鼠标交互操作系统的设计方案。

**目标**: 实现符合需求文档描述的完整键盘鼠标交互功能,包括工具切换、视图导航、对象编辑和选择增强。

**参考文档**: `rawRequirements/场景编辑器（Scene View）操作指南.md`

---

## 第一部分:架构设计概览

基于当前技术栈(React + R3F + Zustand),采用以下架构实现键盘鼠标交互系统:

### 核心设计思路

1. **集中式键盘管理器** - 创建 `KeyboardShortcutManager` 组件,在 DOM 层级监听所有键盘事件,根据当前编辑器状态(激活工具、选中对象等)分发到对应的处理器

2. **分层的鼠标交互** - 将鼠标操作分为两层:
   - **视图导航层**: 处理 Alt+拖动、中键平移、飞行漫游等不改变对象的操作
   - **对象编辑层**: 处理工具 Gizmo 交互、框选、点选等改变对象的操作

3. **工具策略模式** - 每个工具(Q/W/E/R/Y)作为独立策略,统一接口管理:
   - 工具激活/停用生命周期
   - 鼠标事件处理
   - 快捷键响应
   - Gizmo 渲染

4. **状态管理扩展** - 在 `editorStore` 中新增:
   - `activeTool`: 当前激活的工具
   - `cursorMode`: 光标状态
   - `navigationMode`: 导航模式

这样的设计确保了操作互不干扰(需求文档强调的"视图导航与物体编辑工具互不干扰"),并且易于扩展。

---

## 第二部分:键盘快捷键系统设计

### 快捷键管理器架构

创建 `KeyboardShortcutManager` 组件,采用优先级队列机制处理快捷键冲突。

### 1. 快捷键注册表

使用 Map 结构存储所有快捷键映射:

```typescript
type ShortcutAction = {
  action: string;
  params?: any;
  priority: number;
  requiresSelection?: boolean;
  disabledIn2D?: boolean;
};

const shortcuts: Record<string, ShortcutAction> = {
  // 工具切换 (Priority 1)
  'KeyQ': { action: 'setTool', params: 'hand', priority: 1 },
  'KeyW': { action: 'setTool', params: 'translate', priority: 1 },
  'KeyE': { action: 'setTool', params: 'rotate', priority: 1, disabledIn2D: true },
  'KeyR': { action: 'setTool', params: 'scale', priority: 1 },
  'KeyY': { action: 'setTool', params: 'universal', priority: 1 },

  // 功能键 (Priority 2)
  'KeyF': { action: 'focusObject', priority: 2, requiresSelection: true },
  'F2': { action: 'renameObject', priority: 2, requiresSelection: true },
  'Delete': { action: 'deleteObject', priority: 2, requiresSelection: true },

  // 组合键 (Priority 3)
  'Shift+KeyF': { action: 'followObject', priority: 3, requiresSelection: true },
  'Shift+Delete': { action: 'deleteObjectImmediate', priority: 3, requiresSelection: true },
  'Ctrl+KeyA': { action: 'selectAll', priority: 3 },
  'Ctrl+KeyD': { action: 'duplicateObject', priority: 3, requiresSelection: true },
  'Ctrl+KeyZ': { action: 'undo', priority: 3 },
  'Ctrl+KeyY': { action: 'redo', priority: 3 },
  'Ctrl+Shift+KeyZ': { action: 'resetTransform', priority: 4, requiresSelection: true },
};
```

### 2. 修饰键检测

统一处理 Ctrl/Shift/Alt 组合,自动适配 Mac 系统:

```typescript
const isMac = /Mac/.test(navigator.platform);

const getModifiers = (e: KeyboardEvent) => ({
  ctrl: isMac ? e.metaKey : e.ctrlKey,
  shift: e.shiftKey,
  alt: isMac ? e.altKey : e.altKey, // Option on Mac
});

const buildShortcutKey = (e: KeyboardEvent): string => {
  const mods = getModifiers(e);
  const parts: string[] = [];
  if (mods.ctrl) parts.push('Ctrl');
  if (mods.shift) parts.push('Shift');
  if (mods.alt) parts.push('Alt');
  parts.push(e.code);
  return parts.join('+');
};
```

### 3. 快捷键优先级

当多个快捷键可能冲突时,按优先级执行:

| 优先级 | 类型 | 示例 |
|--------|------|------|
| 4 | 三键组合 | Ctrl+Shift+Z |
| 3 | 双键组合 | Shift+F, Ctrl+D |
| 2 | 功能键 | F, F2, Delete |
| 1 | 单键工具 | Q/W/E/R/Y |

### 4. 上下文感知

根据编辑器状态禁用/启用特定快捷键:

```typescript
const shouldHandleShortcut = (shortcut: ShortcutAction): boolean => {
  // 输入框聚焦时禁用所有快捷键
  if (document.activeElement?.tagName === 'INPUT') return false;

  // 无选中对象时禁用编辑类快捷键
  if (shortcut.requiresSelection && selectedIds.length === 0) return false;

  // 2D模式下禁用3D专属操作
  if (shortcut.disabledIn2D && viewMode === '2D') return false;

  return true;
};
```

---

## 第三部分:视图导航鼠标操作设计

### 视图导航控制器架构

扩展现有的 OrbitControls,创建 `EditorNavigationControls` 组件,集成所有视图导航操作。

### 1. 多模式鼠标操作

| 操作 | 触发方式 | 功能 |
|------|----------|------|
| 旋转视角 | Alt+左键拖动 | 激活 OrbitControls 的旋转(仅3D模式) |
| 平移视图 | 中键拖动 或 Q工具+左键 | 激活平移 |
| 缩放视图 | 滚轮 或 Alt+右键拖动 | 激活缩放 |
| 飞行漫游 | 右键按住 | 切换到飞行漫游控制器(仅3D模式) |

### 2. 飞行漫游模式实现

创建 `FlyNavigationControls` 子系统:

```typescript
interface FlyControlsState {
  active: boolean;
  velocity: THREE.Vector3;
  moveSpeed: number;
  lookSpeed: number;
}

// 按键映射
const FLY_KEYS = {
  forward: 'KeyW',
  backward: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  up: 'KeyE',
  down: 'KeyQ',
};
```

**飞行模式流程**:
1. 右键按下时锁定指针(Pointer Lock API)
2. WASD 控制前后左右移动(相对相机朝向)
3. QE 控制世界坐标系上下移动
4. 鼠标移动控制视角(类似 FPS 游戏)
5. Shift 键按住时移动速度提升 2-3 倍
6. 右键释放时解锁指针,恢复普通模式

### 3. 光标状态管理

通过 CSS cursor 属性动态切换:

```typescript
type CursorMode = 'default' | 'grab' | 'grabbing' | 'eye';

const cursorStyles: Record<CursorMode, string> = {
  default: 'default',
  grab: 'grab',
  grabbing: 'grabbing',
  eye: 'url("/cursors/eye.svg") 12 12, crosshair',
};
```

**光标切换时机**:
- 默认: 箭头
- Q工具激活: 抓手(grab)
- Q工具拖动中 或 中键按下: 抓取中(grabbing)
- 右键飞行模式: 眼睛图标

### 4. 操作互不干扰机制

- Alt/中键导航操作不改变 `activeTool` 状态
- 导航时暂停 Gizmo 交互,释放后恢复
- 使用事件优先级确保导航快捷键优先于工具快捷键

---

## 第四部分:工具系统与Gizmo设计

### 工具系统架构

采用策略模式实现五种工具的统一管理。

### 1. 工具接口定义

```typescript
type ToolType = 'hand' | 'translate' | 'rotate' | 'scale' | 'universal';

interface EditorTool {
  name: ToolType;
  shortcut: string;
  icon: React.ComponentType;
  cursor: CursorMode;

  onActivate: () => void;
  onDeactivate: () => void;

  renderGizmo: (selectedObjects: SceneObject[]) => JSX.Element | null;

  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
}
```

### 2. 五种工具实现

| 工具 | 快捷键 | Gizmo | 功能 |
|------|--------|-------|------|
| HandTool | Q | 无 | 光标变抓手,左键拖动平移视图 |
| TranslateTool | W | 三轴箭头 | 拖动箭头沿轴移动对象 |
| RotateTool | E | 三轴圆环 | 拖动圆环绕轴旋转对象 |
| ScaleTool | R | 三轴立方体 | 拖动立方体沿轴缩放,中心点等比缩放 |
| UniversalTool | Y | 组合控件 | 同时显示移动/旋转/缩放控件 |

### 3. Gizmo交互实现

```typescript
interface GizmoInteraction {
  axis: 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'xyz';
  startValue: number | THREE.Vector3 | THREE.Euler;
  currentValue: number | THREE.Vector3 | THREE.Euler;
  sensitivity: number; // Shift键按下时增加
}
```

**交互流程**:
1. 使用 Three.js 的 Raycaster 检测 Gizmo 部件点击
2. 拖动时计算鼠标世界坐标变化
3. 实时更新对象 Transform,同步到 sceneStore
4. Shift 键按下时增加灵敏度(移动距离/旋转角度/缩放比例 × 加速系数)
5. 每次拖动操作生成一个 Command 对象,支持撤销/重做

### 4. Gizmo视觉规范

| 轴 | 颜色 | 高亮色 |
|----|------|--------|
| X轴 | #ff0000 (红) | #ff6666 |
| Y轴 | #00ff00 (绿) | #66ff66 |
| Z轴 | #0000ff (蓝) | #6666ff |

**渲染规则**:
- 未选中对象时不渲染 Gizmo(HandTool 除外)
- 多选时 Gizmo 显示在选中对象的中心点
- 悬停时高亮对应轴

---

## 第五部分:选择增强与对象编辑操作

### 选择系统增强

扩展现有的选择系统,支持多种选择模式。

### 1. 多选模式实现

| 操作 | 触发方式 | 行为 |
|------|----------|------|
| 单选 | 左键点击 | 清除现有选择,选中点击对象 |
| 加选 | Ctrl+左键 | 保留现有选择,添加点击对象 |
| 减选 | Alt+左键 | 保留现有选择,移除点击对象 |
| 全选 | Ctrl+A | 选中场景内所有对象 |
| 框选 | 左键拖动 | 选中框内所有对象 |
| 框选追加 | Ctrl+左键拖动 | 追加框内对象到现有选择 |

### 2. 选择状态管理

```typescript
// editorStore 扩展
interface SelectionState {
  selectedIds: string[];
  activeId: string | null; // 最后选中的对象,用于Inspector显示

  select: (ids: string[], append?: boolean) => void;
  deselect: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
}
```

### 对象编辑快捷键实现

### 1. 复制操作 (Ctrl+D)

```typescript
class DuplicateCommand implements Command {
  private originalIds: string[];
  private newIds: string[];

  execute() {
    this.newIds = this.originalIds.map(id => {
      const original = sceneStore.getObject(id);
      const clone = deepClone(original);
      clone.id = generateUUID();
      clone.name = `${original.name} (Copy)`;
      // 位置偏移避免重叠
      clone.transform.position[0] += 0.5;
      clone.transform.position[2] += 0.5;
      sceneStore.addObject(clone);
      return clone.id;
    });
    editorStore.select(this.newIds);
  }

  undo() {
    this.newIds.forEach(id => sceneStore.removeObject(id));
    editorStore.select(this.originalIds);
  }
}
```

### 2. 删除操作 (Delete / Shift+Delete)

```typescript
class DeleteCommand implements Command {
  private deletedObjects: SceneObject[];

  execute() {
    this.deletedObjects = selectedIds.map(id => sceneStore.getObject(id));
    selectedIds.forEach(id => sceneStore.removeObject(id));
    editorStore.clearSelection();
  }

  undo() {
    this.deletedObjects.forEach(obj => sceneStore.addObject(obj));
    editorStore.select(this.deletedObjects.map(o => o.id));
  }
}
```

**删除确认逻辑**:
- `Delete`: 显示确认对话框,用户确认后执行
- `Shift+Delete`: 直接执行,无确认

### 3. 重命名操作 (F2)

```typescript
const handleRename = () => {
  if (activeId) {
    // 方案A: 聚焦Inspector中的名称输入框
    const input = document.querySelector('[data-inspector-name-input]');
    input?.focus();

    // 方案B: 在Hierarchy中显示内联编辑框
    editorStore.setRenamingId(activeId);
  }
};
```

### 4. 重置变换 (Ctrl+Shift+Z)

```typescript
class ResetTransformCommand implements Command {
  private originalTransforms: Map<string, Transform>;

  execute() {
    this.originalTransforms = new Map();
    selectedIds.forEach(id => {
      const obj = sceneStore.getObject(id);
      this.originalTransforms.set(id, { ...obj.transform });
      sceneStore.updateTransform(id, {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      });
    });
  }

  undo() {
    this.originalTransforms.forEach((transform, id) => {
      sceneStore.updateTransform(id, transform);
    });
  }
}
```

---

## 第六部分:系统集成与技术细节

### 组件集成方案

### 1. 组件层级结构

```
SceneView
├─ Canvas (R3F)
│  ├─ EditorNavigationControls    // 视图导航(Orbit/Pan/Zoom)
│  ├─ FlyNavigationControls       // 飞行漫游模式
│  ├─ ActiveToolGizmo             // 当前工具的Gizmo渲染
│  ├─ SelectionOutline            // 选中对象高亮轮廓
│  ├─ BoxSelector                 // 框选组件
│  └─ SceneContent                // 场景对象
├─ KeyboardShortcutManager        // 键盘管理器(DOM层)
└─ CursorManager                  // 光标状态管理
```

### 2. 状态管理扩展

在 `editorStore` 中新增字段:

```typescript
interface EditorState {
  // 现有字段...

  // 新增: 工具系统
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // 新增: 光标状态
  cursorMode: CursorMode;
  setCursorMode: (mode: CursorMode) => void;

  // 新增: 修饰键状态
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
  };
  setModifiers: (mods: Partial<ModifierState>) => void;

  // 新增: 导航模式
  navigationMode: 'orbit' | 'fly';
  setNavigationMode: (mode: 'orbit' | 'fly') => void;

  // 新增: 视图模式
  viewMode: '2D' | '3D';
  setViewMode: (mode: '2D' | '3D') => void;

  // 新增: 重命名状态
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
}
```

### 3. 性能优化考虑

| 优化点 | 策略 |
|--------|------|
| 键盘事件 | 使用防抖,避免高频触发 |
| Gizmo渲染 | 只在选中对象时渲染 |
| 飞行模式 | 使用 requestAnimationFrame 优化移动平滑度 |
| 拖动变换 | Command 合并(merge),避免撤销栈过大 |
| 选择高亮 | 使用 GPU 实例化渲染轮廓 |

### 4. 跨平台适配

创建 `PlatformUtils`:

```typescript
// src/utils/platform.ts
export const isMac = /Mac/.test(navigator.platform);
export const isWindows = /Win/.test(navigator.platform);

export const getModifierKey = (e: KeyboardEvent | MouseEvent): boolean =>
  isMac ? e.metaKey : e.ctrlKey;

export const getAltKey = (e: KeyboardEvent | MouseEvent): boolean =>
  e.altKey; // Option on Mac, Alt on Windows

export const getShortcutLabel = (shortcut: string): string => {
  if (isMac) {
    return shortcut
      .replace('Ctrl', '⌘')
      .replace('Alt', '⌥')
      .replace('Shift', '⇧');
  }
  return shortcut;
};
```

### 5. 2D/3D模式差异处理

| 功能 | 3D模式 | 2D模式 |
|------|--------|--------|
| Alt+左键 | 旋转视角 | 禁用 |
| 右键飞行 | 启用 | 禁用(改为平移) |
| 旋转工具(E) | 启用 | 禁用 |
| Y轴操作 | 启用 | 禁用 |

---

## 文件结构规划

```
src/
├─ features/
│  └─ editor/
│     ├─ shortcuts/
│     │  ├─ KeyboardShortcutManager.tsx   // 键盘快捷键管理器
│     │  ├─ shortcutRegistry.ts           // 快捷键注册表
│     │  └─ useShortcut.ts                // 快捷键Hook
│     ├─ navigation/
│     │  ├─ EditorNavigationControls.tsx  // 视图导航控制器
│     │  ├─ FlyNavigationControls.tsx     // 飞行漫游控制器
│     │  └─ useFlyMode.ts                 // 飞行模式Hook
│     ├─ tools/
│     │  ├─ ToolManager.tsx               // 工具管理器
│     │  ├─ types.ts                      // 工具类型定义
│     │  ├─ HandTool.tsx                  // 抓手工具
│     │  ├─ TranslateTool.tsx             // 移动工具
│     │  ├─ RotateTool.tsx                // 旋转工具
│     │  ├─ ScaleTool.tsx                 // 缩放工具
│     │  └─ UniversalTool.tsx             // 综合变换工具
│     ├─ selection/
│     │  ├─ SelectionManager.tsx          // 选择管理器
│     │  └─ useMultiSelect.ts             // 多选Hook
│     └─ commands/
│        ├─ Command.ts                    // Command接口
│        ├─ CommandHistory.ts             // 命令历史(撤销/重做)
│        ├─ DuplicateCommand.ts           // 复制命令
│        ├─ DeleteCommand.ts              // 删除命令
│        ├─ TransformCommand.ts           // 变换命令
│        └─ ResetTransformCommand.ts      // 重置变换命令
├─ utils/
│  └─ platform.ts                         // 平台检测工具
└─ assets/
   └─ cursors/
      ├─ grab.svg                         // 抓手光标
      └─ eye.svg                          // 眼睛光标
```

---

## 实现阶段规划

### 第一阶段:核心基础(本次实现)

1. 键盘快捷键管理器
2. 工具切换系统(Q/W/E/R/Y)
3. 视图导航增强(Alt+鼠标、中键、飞行模式)
4. 选择增强(Ctrl加选、Alt减选、Ctrl+A全选)
5. 对象编辑快捷键(Ctrl+D、Delete、F2、Ctrl+Shift+Z)

### 第二阶段:进阶功能(后续扩展)

1. 完整的撤销/重做系统
2. 吸附网格、吸附顶点
3. 方向键视图平移
4. 2D模式完整支持
5. 自定义快捷键配置

---

## 测试策略

### 单元测试

- 快捷键解析与匹配
- 平台检测逻辑
- Command 执行与撤销

### 集成测试

- 工具切换流程
- 选择操作组合
- 视图导航与编辑操作互不干扰

### E2E测试

- 完整编辑工作流
- 跨平台快捷键验证
