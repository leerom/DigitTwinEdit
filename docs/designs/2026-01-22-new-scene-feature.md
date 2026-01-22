# 新建场景功能设计文档

**日期**: 2026-01-22
**状态**: 已通过

## 1. 功能概述

实现"新建场景"功能，允许用户创建一个包含默认配置（主相机和平行光）的空白场景。该功能包括UI菜单入口、未保存修改检查、新场景名称输入、默认对象生成以及场景文件的自动保存。

## 2. 核心流程

1.  **触发**: 用户点击菜单栏 "文件" -> "新建场景"。
2.  **脏检查 (Dirty Check)**:
    *   检查当前场景是否有未保存的修改 (`isDirty` 标志)。
    *   **有修改**: 弹出确认对话框 ("保存", "不保存", "取消")。
        *   "保存": 保存当前场景 -> 继续步骤 3。
        *   "不保存": 丢弃修改 -> 继续步骤 3。
        *   "取消": 结束操作。
    *   **无修改**: 直接进入步骤 3。
3.  **输入名称**: 弹出 `InputDialog` 让用户输入新场景名称。
    *   验证: 非空，合法文件名。
4.  **创建场景**:
    *   清空当前场景数据（层级视图、场景视图）。
    *   生成新场景数据结构。
    *   添加默认对象:
        *   **Main Camera**: 默认位置 (0, 1, -10)，Unity 风格配置。
        *   **Directional Light**: 默认位置 (0, 3, 0)，带图标和辅助线。
5.  **保存与加载**:
    *   自动将新场景保存为 `.json` 文件至 `Assets/Scenes/` 目录。
    *   加载新场景到编辑器，更新 UI。

## 3. 数据结构与状态管理

### 3.1 SceneStore 扩展 (`src/stores/sceneStore.ts`)

*   **状态**:
    *   `isDirty: boolean`: 标记场景是否被修改。
    *   `currentScenePath: string | null`: 当前场景文件路径。
*   **Actions**:
    *   `createNewScene(name: string)`: 初始化新场景数据。
    *   `markDirty()`: 任意修改操作（移动、添加、删除等）触发。
    *   `markClean()`: 保存成功后触发。
    *   `setScenePath(path: string)`: 更新路径。

### 3.2 默认对象配置 (Unity 风格)

*   **Main Camera**:
    *   Position: `[0, 1, -10]`
    *   Rotation: `[0, 0, 0]`
    *   Component: `{ fov: 60, near: 0.3, far: 1000 }`
*   **Directional Light**:
    *   Position: `[0, 3, 0]`
    *   Rotation: `[50, -30, 0]` (欧拉角)
    *   Component: `{ intensity: 1, color: "#ffffff", castShadow: true }`

## 4. UI 组件设计

### 4.1 InputDialog (`src/components/common/InputDialog.tsx`)
*   新组件，用于获取用户输入。
*   Props: `isOpen`, `title`, `placeholder`, `onConfirm(value)`, `onCancel`.

### 4.2 SaveChangesDialog
*   复用或扩展 `ConfirmDialog`，支持三个操作按钮。

### 4.3 菜单更新 (`src/components/layout/Header.tsx`)
*   移除 "清空场景"。
*   添加 "新建场景"。

### 4.4 场景视图渲染 (`src/features/scene/SceneRenderer.tsx`)
*   **光源可视化**:
    *   显示 `DirectionalLightHelper`。
    *   **新增图标**: 在光源位置渲染一个可点击的图标（如黄色圆盘/球体），支持选中操作。
*   **相机可视化**:
    *   显示 `CameraHelper` (选中时)。
    *   **新增图标**: 在相机位置渲染一个可点击的相机图标。

## 5. 服务层 (`src/features/scene/services/SceneManager.ts`)

创建 `SceneManager` 单例或服务，封装复杂逻辑：
*   `createNewScene(name)`: 生成场景对象。
*   `saveSceneToFile(scene)`: 处理文件保存逻辑。
*   `checkUnsavedChanges()`: 检查脏状态。

## 6. 交互细节
*   新建场景后，层级视图根节点显示新场景名称。
*   主相机和平行光在层级视图中默认存在。
*   场景视图中的相机和光源图标支持点击选中，属性面板可编辑其 Transform 和组件属性。
