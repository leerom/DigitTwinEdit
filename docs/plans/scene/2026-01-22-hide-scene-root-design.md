# 方案：在层级视图中隐藏 Root 根节点

## 1. 概述 (Overview)

当前编辑器中，场景层级视图（Hierarchy Panel）显示了一个名为 "Root" 的根节点，所有其他对象（相机、灯光等）都是它的子节点。

**目标**：在 UI 层面移除 "Root" 节点的显示，将场景下的第一级内容（如 Main Camera, Directional Light）直接展示在场景名称下方，使其视觉效果更扁平，符合用户对场景文件结构的直觉。

## 2. 背景与决策 (Context & Decision)

### 现状分析
1.  **内存结构**：`SceneManager` 在创建新场景时，会生成一个 ID 为 `root` 的 `SceneObject` 作为所有对象的父容器。
2.  **文件结构**：参考 `两江影视城站.scene.json`，实际的场景文件是“扁平”的，包含 `lights`、`tilesModels` 等平行数组，不存在所谓的 "Root" 对象。

### 架构决策
**方案：UI 隐藏，内存保留**

*   **内存层 (In-Memory)**: 继续保留 "Root" 对象作为所有顶级对象的父节点。
    *   *理由*: 统一的树状结构（Single Root Tree）极大地简化了运行时的增删改查、拖拽排序和变换传播逻辑。
*   **表现层 (UI)**: 在 `HierarchyPanel` 中跳过 "Root" 节点的渲染，直接渲染其子节点。
    *   *理由*: 让界面看起来像文件结构一样自然，避免用户看到无关的技术实现细节（Root 容器）。

## 3. 详细设计 (Detailed Design)

### 修改文件
`src/components/panels/HierarchyPanel.tsx`

### 逻辑变更
原逻辑：
```tsx
<div className="pl-4">
  <HierarchyItem id={rootId} depth={0} />
</div>
```

新逻辑：
1.  从 `SceneStore` 获取 `rootId` 对应的完整对象 `rootObject`。
2.  不再渲染 Root 自身的 `HierarchyItem`。
3.  遍历 `rootObject.children` 数组。
4.  为每个子 ID 渲染 `HierarchyItem`，并强制 `depth={0}`（视觉顶层）。

```tsx
// 伪代码示例
const rootObject = useSceneStore((state) => state.scene.objects[rootId]);

return (
  // ...
  <div className="pl-4">
    {rootObject && rootObject.children.map((childId) => (
      <HierarchyItem key={childId} id={childId} depth={0} />
    ))}
  </div>
  // ...
);
```

## 4. 影响分析 (Impact Analysis)

### 导入/导出兼容性
此方案完美兼容未来的导入导出功能：
*   **导入 (Import)**: 加载器读取扁平 JSON，在内存中创建 Root，将读取到的灯光、模型挂在 Root 下。UI 会自动展示这些子节点，用户感觉就像“直接加载了文件内容”。
*   **导出 (Export)**: 导出器从内存 Root 节点开始遍历，忽略 Root 本身，将其子节点按类型（Light/Model/Camera）分类写入 JSON 数组。

### 交互影响
*   **选中**: 用户将无法在 Hierarchy 中选中 "Root"（这是预期的，因为 Root 应当对用户透明）。
*   **拖拽**: 如果实现了拖拽功能，拖拽到“场景名称”上应逻辑映射为“成为 Root 的子节点”。

## 5. 验证步骤 (Verification)
1.  运行编辑器。
2.  检查 Hierarchy 面板。
3.  确认不再显示 "Root" 文件夹图标。
4.  确认 "Main Camera" 和 "Directional Light" 显示在最顶层，缩进正确。
5.  确认展开/折叠子对象的功能依然正常。
