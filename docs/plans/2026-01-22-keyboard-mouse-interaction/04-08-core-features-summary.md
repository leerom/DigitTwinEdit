# 04-08 核心功能章节概要

由于文档篇幅较长,以下章节提供核心实现要点。完整的 TDD 步骤请参考 01-03 章节的模式。

---

## 04 - 工具系统实现

### 核心任务

**Task 13-20: 五种工具实现**

1. **HandTool (Q)** - 抓手工具
   - 不渲染 Gizmo
   - 光标切换为 grab/grabbing
   - 左键拖动触发视图平移

2. **TranslateTool (W)** - 移动工具
   - 使用 TransformControls mode="translate"
   - 拖动更新对象 position
   - Shift 加速

3. **RotateTool (E)** - 旋转工具
   - TransformControls mode="rotate"
   - 更新对象 rotation
   - 2D 模式禁用

4. **ScaleTool (R)** - 缩放工具
   - TransformControls mode="scale"
   - 更新对象 scale

5. **UniversalTool (Y)** - 综合工具
   - 同时显示移动/旋转/缩放控件

**关键组件:**
```typescript
// src/features/editor/tools/ActiveToolGizmo.tsx
export const ActiveToolGizmo = () => {
  const activeTool = useActiveTool();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const objects = useSceneStore((state) => state.scene.objects);

  const selectedObjects = selectedIds.map(id => objects[id]).filter(Boolean);

  if (activeTool === 'hand' || selectedObjects.length === 0) {
    return null;
  }

  return <TransformControls mode={getControlsMode(activeTool)} />;
};
```

---

## 05 - 视图导航控制

### 核心任务

**Task 21-30: 导航控制器**

1. **EditorNavigationControls** - 基础导航
   - Alt+左键旋转 (仅3D)
   - Alt+右键缩放
   - 中键平移
   - 滚轮缩放

2. **FlyNavigationControls** - 飞行模式
   - 右键激活,锁定指针
   - WASD 前后左右
   - QE 上下移动
   - 鼠标移动控制视角
   - Shift 加速

3. **CursorManager** - 光标管理
   - CSS cursor 动态切换
   - default / grab / grabbing / eye

**关键实现:**
```typescript
// Pointer Lock API
const handleRightMouseDown = () => {
  canvas.requestPointerLock();
  setNavigationMode('fly');
};

const handlePointerLockChange = () => {
  if (document.pointerLockElement !== canvas) {
    setNavigationMode('orbit');
  }
};
```

---

## 06 - 选择系统增强

### 核心任务

**Task 31-40: 多选功能**

1. **Ctrl+左键加选**
   ```typescript
   const handleClick = (e: ThreeEvent<MouseEvent>) => {
     if (e.ctrlKey) {
       editorStore.select([...selectedIds, objectId]);
     } else {
       editorStore.select([objectId]);
     }
   };
   ```

2. **Alt+左键减选**
   ```typescript
   if (e.altKey) {
     editorStore.deselect([objectId]);
   }
   ```

3. **Ctrl+A 全选**
   ```typescript
   case 'selectAll':
     const allIds = Object.keys(sceneStore.scene.objects);
     editorStore.select(allIds);
   ```

4. **框选增强** - 修改现有 BoxSelector
   - 支持 Ctrl 修饰键追加选择

---

## 07 - 命令系统

### 核心任务

**Task 41-55: Command 实现**

1. **CommandHistory**
   ```typescript
   export class CommandHistory {
     private undoStack: Command[] = [];
     private redoStack: Command[] = [];

     execute(command: Command) {
       command.execute();
       this.undoStack.push(command);
       this.redoStack = [];
     }

     undo() {
       const command = this.undoStack.pop();
       if (command) {
         command.undo();
         this.redoStack.push(command);
       }
     }

     redo() {
       const command = this.redoStack.pop();
       if (command) {
         command.execute();
         this.undoStack.push(command);
       }
     }
   }
   ```

2. **DuplicateCommand** - Ctrl+D
3. **DeleteCommand** - Delete
4. **ResetTransformCommand** - Ctrl+Shift+Z

---

## 08 - 系统集成

### 核心任务

**Task 56-65: 组件集成**

1. 更新 SceneView 组件
   ```tsx
   <Canvas>
     <EditorNavigationControls />
     <FlyNavigationControls />
     <ActiveToolGizmo />
     <BoxSelector />
     <SceneContent />
   </Canvas>
   <KeyboardShortcutManager />
   <CursorManager />
   ```

2. 性能优化
   - requestAnimationFrame 优化拖动
   - 事件防抖/节流
   - Gizmo 实例化渲染

3. 事件流集成测试

---

## 09 - 测试策略

### 测试覆盖

**单元测试:**
- 每个工具的独立测试
- 快捷键匹配逻辑
- Command 执行/撤销

**集成测试:**
- 工具切换流程
- 选择+编辑组合操作
- 导航+工具互不干扰

**E2E 测试:**
```typescript
test('complete editing workflow', () => {
  // 1. 选择对象
  // 2. 切换到移动工具 (W)
  // 3. 拖动对象
  // 4. 复制对象 (Ctrl+D)
  // 5. 撤销 (Ctrl+Z)
  // 6. 重做 (Ctrl+Y)
});
```

---

## 实现顺序总结

```
01 类型定义
  ↓
02 状态管理
  ↓
03 键盘快捷键
  ↓
04 工具系统
  ↓
05 视图导航
  ↓
06 选择增强
  ↓
07 命令系统
  ↓
08 系统集成
  ↓
09 测试完善
```

**每个阶段:**
1. TDD 流程 (测试先行)
2. 小步提交
3. 集成测试
4. 文档更新
