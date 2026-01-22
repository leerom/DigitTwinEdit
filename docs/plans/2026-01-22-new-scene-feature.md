# 新建场景功能实施计划

> **给 Claude 的说明:** 必须使用 `superpowers:executing-plans` 技能逐任务执行此计划。

**目标:** 实现"新建场景"功能，创建一个包含默认 Unity 风格相机和光照的空白场景，并处理未保存修改的保护逻辑。

**架构:**
扩展 `SceneStore` 以追踪脏状态（未保存修改）。添加 `SceneManager` 服务处理创建/保存逻辑。实现 `InputDialog` 用于命名。更新 UI 以集成新工作流。增强 `SceneView` 以可视化相机/光源对象。

**技术栈:** React, Zustand, Three.js, @react-three/drei, TailwindCSS

---

### 任务 1: Scene Store 更新

**文件:**
- 修改: `src/stores/sceneStore.ts`

**步骤 1: 编写失败测试**

创建 `src/stores/sceneStore.dirty.test.ts`:
```typescript
import { useSceneStore } from './sceneStore';
import { act } from '@testing-library/react';

describe('SceneStore Dirty State', () => {
  beforeEach(() => {
    useSceneStore.setState(useSceneStore.getInitialState());
  });

  test('should track dirty state', () => {
    const store = useSceneStore.getState();
    expect(store.isDirty).toBe(false);

    act(() => {
      store.markDirty();
    });
    expect(useSceneStore.getState().isDirty).toBe(true);

    act(() => {
      store.markClean();
    });
    expect(useSceneStore.getState().isDirty).toBe(false);
  });

  test('addObject should mark scene as dirty', () => {
    act(() => {
      useSceneStore.getState().addObject({});
    });
    expect(useSceneStore.getState().isDirty).toBe(true);
  });
});
```

**步骤 2: 运行测试以验证失败**

运行: `npm test sceneStore.dirty`
预期: 失败 (isDirty 未定义)

**步骤 3: 更新 SceneStore**

修改 `src/stores/sceneStore.ts`:
- 在 `SceneState` 接口中添加 `isDirty`, `currentScenePath`
- 在 Actions 中添加 `markDirty`, `markClean`, `setScenePath`
- 初始化 `isDirty: false`, `currentScenePath: null`
- 更新 `addObject`, `removeObject`, `updateTransform`, `reparentObject`, `updateComponent` 以调用 `markDirty` (设置 `isDirty: true`)

**步骤 4: 运行测试以验证通过**

运行: `npm test sceneStore.dirty`
预期: 通过

**步骤 5: 提交**

```bash
git add src/stores/sceneStore.ts src/stores/sceneStore.dirty.test.ts
git commit -m "feat: add dirty state tracking to scene store"
```

---

### 任务 2: 输入对话框组件

**文件:**
- 创建: `src/components/common/InputDialog.tsx`
- 测试: `src/components/common/InputDialog.test.tsx`

**步骤 1: 编写测试**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { InputDialog } from './InputDialog';

describe('InputDialog', () => {
  test('renders correctly', () => {
    render(
      <InputDialog
        isOpen={true}
        title="Enter Name"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText('Enter Name')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('calls onConfirm with input value', () => {
    const onConfirm = vi.fn();
    render(
      <InputDialog
        isOpen={true}
        title="Test"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Scene' } });
    fireEvent.click(screen.getByText('确认'));

    expect(onConfirm).toHaveBeenCalledWith('New Scene');
  });
});
```

**步骤 2: 运行测试**

运行: `npm test InputDialog`
预期: 失败

**步骤 3: 实现 InputDialog**

使用 `Dialog` 组件创建 `src/components/common/InputDialog.tsx`。
- Props: `isOpen`, `title`, `placeholder`, `defaultValue`, `onConfirm`, `onCancel`
- State: `value`, `error`
- 验证: 非空字符串
- 按钮: 取消, 确认

**步骤 4: 验证**

运行: `npm test InputDialog`
预期: 通过

**步骤 5: 提交**

```bash
git add src/components/common/InputDialog.tsx src/components/common/InputDialog.test.tsx
git commit -m "feat: add InputDialog component"
```

---

### 任务 3: 场景管理服务

**文件:**
- 创建: `src/features/scene/services/SceneManager.ts`
- 修改: `src/types/index.ts` (确保 Camera/Light 组件类型存在)

**步骤 1: 编写类型**

更新 `src/types/index.ts`:
- 添加 `CameraComponent` 接口
- 添加 `LightComponent` 接口
- 更新 `SceneObject` components 定义

**步骤 2: 编写 SceneManager 测试**

创建 `src/features/scene/services/SceneManager.test.ts`:
- 测试 `createNewScene` 创建正确的结构
- 测试 `checkUnsavedChanges` 返回 store 状态

**步骤 3: 实现 SceneManager**

创建 `src/features/scene/services/SceneManager.ts`:
- `createNewScene(name)`: 返回带有 Main Camera 和 Directional Light 的新 `Scene` 对象
- `saveSceneToFile(scene)`: JSON 序列化和下载触发
- 默认 Camera/Light 创建的辅助方法

**步骤 4: 验证**

运行: `npm test SceneManager`
预期: 通过

**步骤 5: 提交**

```bash
git add src/features/scene/services/SceneManager.ts src/features/scene/services/SceneManager.test.ts src/types/index.ts
git commit -m "feat: implement SceneManager service"
```

---

### 任务 4: 场景渲染器增强 (图标 & 辅助线)

**文件:**
- 修改: `src/features/scene/SceneRenderer.tsx`

**步骤 1: 设置测试场景**

视觉渲染没有单元测试 - 制定手动验证计划:
- 创建带有相机和光源的场景
- 验证图标显示在正确位置
- 验证选中时显示辅助线 (视锥体/光线)

**步骤 2: 实现相机/光源可视化**

更新 `src/features/scene/SceneRenderer.tsx`:
- 引入 `CameraHelper`, `DirectionalLightHelper` (从 `three` / `@react-three/drei`)
- 在 `ObjectRenderer` 中:
  - 如果类型是 `CAMERA`: 渲染 `<CameraIcon />` (公告板 sprite 或 mesh) + `useHelper(ref, CameraHelper)`
  - 如果类型是 `LIGHT`: 渲染 `<LightIcon />` (公告板 sprite 或 mesh) + `useHelper(ref, DirectionalLightHelper)`
- 图标应可点击 (触发选中)

**步骤 3: 提交**

```bash
git add src/features/scene/SceneRenderer.tsx
git commit -m "feat: add camera and light visualization in scene view"
```

---

### 任务 5: UI 集成 (Header & Dialogs)

**文件:**
- 修改: `src/components/layout/Header.tsx`

**步骤 1: 更新 Header 逻辑**

- 引入 `SceneManager`, `InputDialog`
- 添加状态: `showNewSceneDialog` (用于命名), `showSaveConfirmDialog`
- 移除 "清空场景" 菜单项
- 添加 "新建场景" 菜单项
- 实现 `handleNewScene`:
  - 检查 `isDirty`
  - 如果脏 -> `setShowSaveConfirmDialog(true)`
  - 否则 -> `setShowNewSceneDialog(true)`
- 实现 Dialog 回调:
  - SaveConfirm: 保存 -> 打开新对话框; 不保存 -> 打开新对话框; 取消 -> 关闭
  - NewScene: 确认(name) -> `sceneManager.createNewScene` -> `loadScene` -> `saveSceneToFile`

**步骤 2: 手动验证**

- 点击新建场景 -> 检查脏状态逻辑
- 输入名称 -> 检查创建
- 检查层级 (根名称, 相机, 光源)
- 检查视口 (图标可见)

**步骤 3: 提交**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: integrate new scene workflow in header"
```
