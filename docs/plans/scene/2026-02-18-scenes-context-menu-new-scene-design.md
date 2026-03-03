# Scenes 面板右键菜单"新建"功能设计

## 设计日期
2026-02-18

## 背景

当前 Scenes 面板中，右键点击 SceneCard 显示操作菜单（打开/重命名/删除），但：

1. 没有"新建场景"菜单项
2. 右键点击 Scenes 网格空白处没有任何响应

本次设计目标是新增"新建"菜单项并实现一致的右键菜单交互体验。

## 需求

1. **新增"新建"菜单项**：在右键菜单顶部加入"新建"，点击后：
   - 若当前场景有未保存修改（isDirty = true），先弹出保存确认对话框
   - 弹出场景名称输入框（默认值"新建场景"，自动去重）
   - 创建新场景并自动激活、加载到编辑器

2. **空白处右键行为**：
   - 右键点击 Scenes 网格空白处：显示完整菜单，但仅"新建"可用，其余项禁用
   - 右键点击 SceneCard：显示完整菜单，所有项可用

## 菜单项状态对照

| 触发位置        | 新建 | 打开 | 重命名 | 删除 |
|---------------|------|------|--------|------|
| 网格空白处      | ✅   | ❌   | ❌     | ❌   |
| SceneCard 上  | ✅   | ✅   | ✅     | ✅   |

## 技术设计

### 新增文件

**`packages/client/src/hooks/useNewSceneFlow.ts`**

封装新建场景的完整状态和业务逻辑，供 `Header.tsx` 和 `ProjectPanel.tsx` 共用：

```typescript
interface UseNewSceneFlowReturn {
  // 对话框可见状态
  showSaveConfirmDialog: boolean;
  showNewSceneDialog: boolean;
  isSaving: boolean;
  isCreating: boolean;

  // 事件处理
  handleNewSceneClick: () => void;
  handleSaveAndProceed: () => Promise<void>;
  handleDiscardAndProceed: () => void;
  handleCancelSave: () => void;
  handleCreateScene: (name: string) => Promise<void>;
  handleCancelCreate: () => void;
}
```

内部依赖：
- `useSceneStore` → `isDirty`, `scene`, `markClean`
- `useProjectStore` → `autoSaveScene`, `scenes`, `createScene`
- `getUniqueSceneName` 工具函数（已有）

### 修改文件

**`packages/client/src/components/panels/SceneCard.tsx`**
- 新增 `onNew?: () => void` prop
- `menuItems` 顶部插入 `{ label: '新建', icon: 'add', onClick: onNew }`

**`packages/client/src/components/panels/ProjectPanel.tsx`**
- 引入 `useNewSceneFlow` Hook，在组件底部渲染保存确认对话框 + 名称输入对话框
- Scenes 内容区域最外层 div（`flex-1 p-4 overflow-y-auto`）添加 `onContextMenu` 处理器
- 空白处右键：构建菜单 items，打开/重命名/删除 均设 `disabled: true`
- `SceneCard` 传入 `onNew={handleNewSceneClick}`

**`packages/client/src/components/layout/Header.tsx`**
- 移除本地 `showSaveConfirmDialog`、`showNewSceneDialog` 等状态及 dialog JSX
- 改用 `useNewSceneFlow` Hook

### 数据流

```
用户右键点击"新建"
  ↓ handleNewSceneClick()
useNewSceneFlow Hook
  ↓ 检查 isDirty
  [dirty] → showSaveConfirmDialog = true
    → "保存" → autoSaveScene() → markClean() → showNewSceneDialog = true
    → "不保存" → showNewSceneDialog = true
    → "取消" → 关闭
  [clean] → showNewSceneDialog = true
  ↓ handleCreateScene(name)
  → getUniqueSceneName(name, scenes)
  → projectStore.createScene(uniqueName)
  → 后端创建场景（含主相机 + 平行光）
  → projectStore 更新本地 scenes 列表
  → 自动激活新场景 → sceneStore.loadScene()
  → markClean()
```

## 错误处理

| 错误场景 | 处理方式 |
|---------|---------|
| 保存失败 | 提示"保存失败，请重试"，保持保存确认对话框打开 |
| 创建场景失败 | 提示"创建场景失败：{错误信息}"，关闭输入对话框 |
| 无活动项目 | `currentProject` 为 null 时，handleNewSceneClick 提前返回 |
| 输入空白名称 | 使用默认值"新建场景"，执行去重逻辑 |

## UX 细节

- 保存确认对话框按钮顺序：取消 / 不保存 / 保存
- 名称输入框默认值"新建场景"，自动全选，Enter 确认，Escape 取消
- 保存中 / 创建中时显示 loading 状态，防止重复点击

## 受影响文件清单

| 文件 | 操作 |
|------|------|
| `src/hooks/useNewSceneFlow.ts` | 新建 |
| `src/components/panels/SceneCard.tsx` | 修改（添加 onNew prop + 菜单项） |
| `src/components/panels/ProjectPanel.tsx` | 修改（空白处右键 + 对话框 + 传 onNew） |
| `src/components/layout/Header.tsx` | 修改（改用 Hook，移除重复逻辑） |

## 不在范围内

- 其他类型文件夹（Models/Materials/Textures）的右键菜单
- 场景排序、场景复制等其他场景操作
