# 隐藏场景根节点实施计划

> **给 Claude 的提示:** 必需的子技能：使用 `superpowers:executing-plans` 来逐步执行此计划。

**目标:** 从层级视图面板 UI 中移除 "Root" 节点，同时保持底层数据结构不变。这使 UI 与文件结构保持一致。

**架构:** 仅 UI 变更。`SceneStore` 继续管理单个 `Root` 对象以保证数据完整性，但 `HierarchyPanel` 跳过渲染 Root 节点，直接渲染其子节点。

**技术栈:** React, Zustand (用于状态管理)

---

### 任务 1: 更新 HierarchyPanel 以隐藏 Root

**文件:**
- 修改: `src/components/panels/HierarchyPanel.tsx`

**步骤 1: 创建测试设置 (手动验证)**
由于 HierarchyPanel 没有现有的测试，我们将通过运行应用程序或根据需要创建临时测试文件来验证。对于此计划，我们将专注于实现的正确性。

**步骤 2: 修改 HierarchyPanel.tsx**

更新渲染逻辑以：
1. 使用 `rootId` 获取 Root 对象。
2. 遍历 `rootObject.children` 而不是为 `rootId` 渲染 `HierarchyItem`。
3. 为每个子节点渲染 `HierarchyItem`，并设置 `depth={0}`。

```tsx
// src/components/panels/HierarchyPanel.tsx

// ... existing imports

export const HierarchyPanel: React.FC = () => {
  const sceneName = useSceneStore((state) => state.scene.name);
  const rootId = useSceneStore((state) => state.scene.root);
  // Add this:
  const rootObject = useSceneStore((state) => state.scene.objects[rootId]);

  return (
    // ...
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-1">
        {/* Scene Root Header - Keep this, it shows scene name */}
        <div className="hierarchy-item text-slate-400 font-semibold mb-1">
          {/* ... */}
          <span>{sceneName}</span>
        </div>

        {/* Scene Objects */}
        <div className="pl-4">
          {/* OLD: <HierarchyItem id={rootId} depth={0} /> */}
          {/* NEW: */}
          {rootObject && rootObject.children.map((childId) => (
            <HierarchyItem key={childId} id={childId} depth={0} />
          ))}
        </div>
      </div>
    // ...
  );
};
```

**步骤 3: 提交**

```bash
git add src/components/panels/HierarchyPanel.tsx
git commit -m "feat(ui): hide root node in hierarchy panel"
```
