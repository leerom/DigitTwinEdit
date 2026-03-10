# Phase 1: 顶栏 & 状态栏

> 上级索引：[README.md](./README.md)

---

## Task 1: NodeMaterialEditor 顶栏重设计 {#task-1}

**文件:**
- Modify: `packages/client/src/features/nodeMaterial/NodeMaterialEditor.tsx`

**目标:** 顶栏高度 h-10、背景 bg-header-dark、面包屑路径、保存按钮状态色

### Step 1: 替换顶栏 JSX

找到文件第 133–171 行（顶栏 div 块），替换为：

```tsx
  return (
    <ReactFlowProvider>
      <div className="fixed inset-0 z-50 flex flex-col bg-bg-dark text-white font-display">
        {/* 顶栏 */}
        <div className="flex items-center gap-2 px-3 h-10 border-b border-border-dark bg-header-dark shrink-0">
          {/* 返回按钮 */}
          <button
            aria-label="返回"
            onClick={closeNodeEditor}
            className="flex items-center gap-1 text-[12px] text-slate-400 hover:text-white hover:bg-white/5 px-2 py-1 rounded transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>返回</span>
          </button>

          {/* 分隔线 */}
          <div className="w-px h-4 bg-border-dark mx-1" />

          {/* 面包屑 */}
          <span className="material-symbols-outlined text-[16px] text-slate-500">device_hub</span>
          <span className="text-[11px] text-slate-500">节点材质</span>
          <span className="text-[11px] text-slate-600">/</span>
          <span className="text-[12px] text-slate-300 font-medium truncate max-w-[200px]">
            {materialName || '加载中...'}
          </span>

          {/* 右侧工具 */}
          <div className="ml-auto flex items-center gap-1">
            <button
              disabled={!canUndo}
              onClick={undo}
              className="flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <span className="material-symbols-outlined text-[16px]">undo</span>
            </button>
            <button
              disabled={!canRedo}
              onClick={redo}
              className="flex items-center justify-center w-7 h-7 rounded text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-colors"
              title="重做 (Ctrl+Y)"
            >
              <span className="material-symbols-outlined text-[16px]">redo</span>
            </button>

            {/* 分隔线 */}
            <div className="w-px h-4 bg-border-dark mx-1" />

            {/* 保存按钮 */}
            <button
              onClick={handleSave}
              className={`flex items-center gap-1 px-3 py-1 text-[11px] font-medium text-white rounded transition-all ${
                saveStatus === 'saving'
                  ? 'bg-accent-blue/70 animate-pulse cursor-not-allowed'
                  : saveStatus === 'saved'
                    ? 'bg-green-600 hover:bg-green-500'
                    : saveStatus === 'error'
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-accent-blue hover:bg-accent-blue/90'
              }`}
            >
              {saveStatus === 'saved' ? (
                <><span className="material-symbols-outlined text-[14px]">check</span><span>已保存</span></>
              ) : saveStatus === 'error' ? (
                <><span className="material-symbols-outlined text-[14px]">error</span><span>失败</span></>
              ) : (
                <><span className="material-symbols-outlined text-[14px]">save</span><span>保存</span></>
              )}
            </button>
          </div>
        </div>
```

### Step 2: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep "NodeMaterialEditor" | head -5
```

Expected: 无新增错误

### Step 3: Commit

```bash
git add packages/client/src/features/nodeMaterial/NodeMaterialEditor.tsx
git commit -m "style(nodeMaterial): redesign toolbar - h-10 header-dark breadcrumb save states"
```

---

## Task 2: NodeMaterialEditor 状态栏重设计 {#task-2}

**文件:**
- Modify: `packages/client/src/features/nodeMaterial/NodeMaterialEditor.tsx`

**目标:** h-6 + bg-header-dark + text-[9px] + 节点/边数统计（与三维编辑器 footer 完全一致）

### Step 1: 在组件 return 里修改状态栏

状态栏部分（原第 193–204 行），替换为：

```tsx
        {/* 状态栏 */}
        <footer className="h-6 bg-header-dark border-t border-border-dark px-3 flex items-center justify-between text-[9px] text-slate-500 shrink-0 select-none">
          <div className="flex items-center gap-1">
            {compileError ? (
              <>
                <span className="material-symbols-outlined text-[11px] text-red-400">error</span>
                <span className="text-red-400 truncate max-w-[300px]">{compileError}</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <span className="material-symbols-outlined text-[11px] text-accent-blue animate-spin">refresh</span>
                <span>保存中...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <span className="material-symbols-outlined text-[11px] text-green-400">check_circle</span>
                <span className="text-green-400">已保存</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <span className="material-symbols-outlined text-[11px] text-red-400">warning</span>
                <span className="text-red-400">保存失败</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[11px]">device_hub</span>
                <span>就绪</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>{nodes.length} 节点</span>
            <span>{edges.length} 连线</span>
          </div>
        </footer>
```

### Step 2: 完整的 return 结构检查

确认 `return (` 之后的结构为：
```
ReactFlowProvider
  div.fixed.inset-0
    div.h-10 (顶栏 - Task 1)
    div.flex.flex-1.min-h-0 (主体)
    footer.h-6 (状态栏 - Task 2)
```

### Step 3: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -E "error TS" | wc -l
```

Expected: 4（无新增）

### Step 4: Commit

```bash
git add packages/client/src/features/nodeMaterial/NodeMaterialEditor.tsx
git commit -m "style(nodeMaterial): redesign status bar - h-6 header-dark node/edge stats"
```
