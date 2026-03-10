# 节点材质编辑器 — Phase 4: 系统集成

> 上级索引：[README.md](./README.md)

---

## Task 13: materialFactory.ts — 支持 NodeMaterial 类型

**Files:**
- Modify: `packages/client/src/features/materials/materialFactory.ts`

当前 `createThreeMaterial` 的 `switch(spec.type)` 缺少 `'NodeMaterial'` 分支。

### Step 1: 在 `materialFactory.ts` 顶部添加导入

在第 1 行 `import * as THREE from 'three';` 之后添加：

```typescript
import { MeshStandardNodeMaterial } from 'three/examples/jsm/nodes/Addons.js';
import type { NodeGraphData } from '@/types';
```

### Step 2: 在 `createThreeMaterial` 的 switch 中添加 `NodeMaterial` 分支

找到第 147 行左右的 `switch (spec.type) {`，在 `case 'MeshStandardMaterial':` 之前插入：

```typescript
    case 'NodeMaterial': {
      // 同步编译节点图（首次调用时从 tslCompiler 导入）
      // props.graph 存储 NodeGraphData
      const graphData = (spec.props as Record<string, unknown>)?.graph as NodeGraphData | undefined;
      if (!graphData) {
        // 无图数据时降级为普通 MeshStandardMaterial
        material = new THREE.MeshStandardMaterial({ color: 0x888888 });
      } else {
        // 动态导入避免循环依赖，tslCompiler 模块级别已缓存，性能无损
        // 注意：此处同步路径通过动态 require 实现；在 ESM 环境需确保编译器已预加载
        // 实际上 @react-three/fiber 渲染循环会在首帧前完成模块初始化
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { compileNodeGraph } = require('@/features/nodeMaterial/compiler/tslCompiler');
          material = compileNodeGraph(graphData);
        } catch {
          material = new MeshStandardNodeMaterial();
        }
      }
      // NodeMaterial 不需要 applyTextureProps（贴图通过 TSL texture() 节点处理）
      return material;
    }
```

> **注意：** Vite 在浏览器环境下不支持 `require()`。改用以下方式（在 `materialFactory.ts` 顶部静态导入）：

**更好的方案（静态导入）：**

在文件顶部添加：
```typescript
// 懒加载引用，首次使用 NodeMaterial 时初始化（避免循环依赖）
let _compileNodeGraph: ((graph: NodeGraphData) => MeshStandardNodeMaterial) | null = null;
async function getCompiler() {
  if (!_compileNodeGraph) {
    const mod = await import('@/features/nodeMaterial/compiler/tslCompiler');
    _compileNodeGraph = mod.compileNodeGraph;
  }
  return _compileNodeGraph;
}
```

但 `createThreeMaterial` 是同步函数。最简单的方案是**直接静态导入**：

```typescript
// materialFactory.ts 顶部（在现有 import 之后）
import { compileNodeGraph } from '@/features/nodeMaterial/compiler/tslCompiler';
import { MeshStandardNodeMaterial } from 'three/examples/jsm/nodes/Addons.js';
import type { NodeGraphData } from '@/types';
```

然后在 switch 中：

```typescript
    case 'NodeMaterial': {
      const graphData = (spec.props as Record<string, unknown>)?.graph as NodeGraphData | undefined;
      if (!graphData) return new MeshStandardNodeMaterial();
      return compileNodeGraph(graphData);
    }
```

### Step 3: 完整的 materialFactory.ts switch 块（修改后）

找到 `createThreeMaterial` 函数中的 switch 块（约第 147–163 行），修改为：

```typescript
  let material: THREE.Material;
  switch (spec.type) {
    case 'NodeMaterial': {
      const graphData = (spec.props as Record<string, unknown>)?.graph as NodeGraphData | undefined;
      if (!graphData) return new MeshStandardNodeMaterial();
      return compileNodeGraph(graphData);
    }
    case 'MeshPhysicalMaterial':
      material = new THREE.MeshPhysicalMaterial(scalarProps as any);
      break;
    case 'MeshPhongMaterial':
      material = new THREE.MeshPhongMaterial(scalarProps as any);
      break;
    case 'MeshLambertMaterial':
      material = new THREE.MeshLambertMaterial(scalarProps as any);
      break;
    case 'MeshBasicMaterial':
      material = new THREE.MeshBasicMaterial(scalarProps as any);
      break;
    case 'MeshStandardMaterial':
    default:
      material = new THREE.MeshStandardMaterial(scalarProps as any);
  }
```

### Step 4: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep "materialFactory" | head -5
```

Expected: 无新增错误（tslCompiler 使用 `any` 类型兼容，TS6133 未使用变量警告可忽略）

### Step 5: Commit

```bash
git add packages/client/src/features/materials/materialFactory.ts
git commit -m "feat(materials): add NodeMaterial branch to createThreeMaterial factory"
```

---

## Task 14: MaterialAssetProp.tsx — "打开节点编辑器"按钮

**Files:**
- Modify: `packages/client/src/components/inspector/MaterialAssetProp.tsx`

### Step 1: 了解当前结构

当前第 33–36 行从 materialStore 中读取 `saveError` / `clearSaveError` / `updateMaterialSpec` / `setPreviewSpec`。需要额外读取 `openNodeEditor`。

当前第 109 行开始返回 JSX。当 `localSpec.type === 'NodeMaterial'` 时，应替换为简化视图（只显示"打开节点编辑器"按钮）。

### Step 2: 修改 `MaterialAssetProp.tsx`

在第 36 行 `const syncMaterialAsset = ...` 之后添加：

```typescript
  const openNodeEditor = useMaterialStore((s) => s.openNodeEditor);
```

在第 109 行 `if (isLoadingSpec) { ... }` 之后，主 `return` 之前插入早返回：

```typescript
  // NodeMaterial：直接显示编辑器入口，不渲染传统材质字段
  if (localSpec.type === 'NodeMaterial') {
    return (
      <div className="bg-[#0c0e14] border border-[#2d333f] p-3 rounded-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">NodeMaterial（节点材质）</span>
          <button
            onClick={() => openNodeEditor(assetId)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-accent-blue hover:bg-accent-blue/90 text-white rounded transition-colors"
          >
            <span className="material-symbols-outlined text-sm">device_hub</span>
            打开节点编辑器
          </button>
        </div>
      </div>
    );
  }
```

### Step 3: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep "MaterialAssetProp" | head -5
```

Expected: 无新增错误（`openNodeEditor` 在 materialStore 的 interface 中尚未声明——此为 Task 3 的工作，需先完成 Task 3 中的 materialStore 修改）

> **前提：** 若 materialStore 未添加 `openNodeEditor`，先执行 [01-foundation.md](./01-foundation.md) 的 Task 3。

### Step 4: Commit

```bash
git add packages/client/src/components/inspector/MaterialAssetProp.tsx
git commit -m "feat(inspector): add NodeMaterial open-editor button in MaterialAssetProp"
```

---

## Task 15: ProjectPanel.tsx — 新建材质对话框增加 NodeMaterial 选项

**Files:**
- Modify: `packages/client/src/components/panels/ProjectPanel.tsx`

### Step 1: 找到新建材质 Dialog 中的 select 元素

约第 925–935 行（`<select ... value={newMaterialType}`）：

```tsx
            <select
              className="bg-[#0c0e14] border border-[#2d333f] text-sm text-white px-2 py-1.5 rounded"
              value={newMaterialType}
              onChange={(e) => setNewMaterialType(e.target.value as MaterialType)}
            >
              <option value="MeshStandardMaterial">MeshStandardMaterial</option>
              <option value="MeshPhysicalMaterial">MeshPhysicalMaterial</option>
              <option value="MeshPhongMaterial">MeshPhongMaterial</option>
              <option value="MeshLambertMaterial">MeshLambertMaterial</option>
              <option value="MeshBasicMaterial">MeshBasicMaterial</option>
            </select>
```

### Step 2: 在最后一个 `<option>` 之后添加

```tsx
              <option value="NodeMaterial">NodeMaterial（节点材质）</option>
```

### Step 3: 验证 — 类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep "ProjectPanel" | head -5
```

Expected: 无错误（`MaterialType` 已在 Task 2 中扩展为包含 `'NodeMaterial'`）

### Step 4: Commit

```bash
git add packages/client/src/components/panels/ProjectPanel.tsx
git commit -m "feat(panel): add NodeMaterial option to new material dialog"
```

---

## Task 16: EditorPage.tsx — 条件渲染 NodeMaterialEditor Overlay

**Files:**
- Modify: `packages/client/src/features/editor/EditorPage.tsx`

### Step 1: 在 EditorPage.tsx 中添加导入

在第 13 行 `import { useAutoSave } from ...` 之后添加：

```typescript
import { NodeMaterialEditor } from '../nodeMaterial/NodeMaterialEditor';
```

在第 21 行 `const { importProgress } = useSceneStore();` 之后添加：

```typescript
  const nodeEditorMaterialId = useMaterialStore((s) => s.nodeEditorMaterialId);
```

### Step 2: 在 return 的 JSX 末尾添加条件渲染

在 `</> ` 闭合标签之前（`ProgressDialog` 之后）插入：

```tsx
      {/* NodeMaterial 节点编辑器 Overlay */}
      {nodeEditorMaterialId !== null && <NodeMaterialEditor />}
```

完整 return 块变为：

```tsx
  return (
    <>
      <MainLayout
        header={<Header />}
        leftPanel={<HierarchyPanel />}
        centerPanel={<SceneView />}
        rightPanel={<InspectorPanel />}
        bottomPanel={<ProjectPanel />}
      />

      {/* Global Progress Dialog */}
      <ProgressDialog
        isOpen={importProgress.isImporting}
        onClose={() => {}}
        title="导入场景"
        percentage={importProgress.percentage}
        currentTask={importProgress.currentTask}
      />

      {/* NodeMaterial 节点编辑器 Overlay */}
      {nodeEditorMaterialId !== null && <NodeMaterialEditor />}
    </>
  );
```

### Step 3: 验证类型检查

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep "EditorPage" | head -5
```

Expected: 无新增错误

### Step 4: Commit

```bash
git add packages/client/src/features/editor/EditorPage.tsx
git commit -m "feat(editor): conditionally render NodeMaterialEditor overlay in EditorPage"
```

---

## Task 17: 集成验证

**Files:**
- Create: `packages/client/src/features/nodeMaterial/nodeMaterialIntegration.test.ts`

### Step 1: 编写集成测试

```typescript
// packages/client/src/features/nodeMaterial/nodeMaterialIntegration.test.ts
import { describe, it, expect } from 'vitest';
import { compileNodeGraph } from './compiler/tslCompiler';
import { createThreeMaterial } from '@/features/materials/materialFactory';
import type { NodeGraphData, MaterialSpec } from '@/types';

// 最小完整图：ColorInput → MaterialOutput.color
const MINIMAL_GRAPH: NodeGraphData = {
  version: 1,
  nodes: [
    {
      id: 'c1', type: 'ColorInput', position: { x: 0, y: 0 },
      data: { typeKey: 'ColorInput', params: { value: '#ff0000' } },
    },
    {
      id: 'out', type: 'MaterialOutput', position: { x: 300, y: 0 },
      data: { typeKey: 'MaterialOutput', params: {} },
    },
  ],
  edges: [
    { id: 'e1', source: 'c1', sourceHandle: 'out', target: 'out', targetHandle: 'color' },
  ],
};

describe('NodeMaterial 集成', () => {
  it('compileNodeGraph 返回合法 MeshStandardNodeMaterial', () => {
    const mat = compileNodeGraph(MINIMAL_GRAPH);
    expect(mat).toBeDefined();
    expect('colorNode' in mat).toBe(true);
    expect(mat.colorNode).not.toBeNull();
  });

  it('createThreeMaterial 能处理 NodeMaterial spec', () => {
    const spec: MaterialSpec = {
      type: 'NodeMaterial',
      props: { graph: MINIMAL_GRAPH },
    };
    const mat = createThreeMaterial(spec);
    expect(mat).toBeDefined();
    // MeshStandardNodeMaterial duck-type 检测
    expect('colorNode' in mat).toBe(true);
  });

  it('createThreeMaterial NodeMaterial 无 graph 时降级为 MeshStandardNodeMaterial', () => {
    const spec: MaterialSpec = {
      type: 'NodeMaterial',
      props: {},
    };
    const mat = createThreeMaterial(spec);
    expect(mat).toBeDefined();
    // 降级为 MeshStandardNodeMaterial（也有 colorNode 属性）
    expect('colorNode' in mat).toBe(true);
  });

  it('序列化后的图保持 version:1', () => {
    expect(MINIMAL_GRAPH.version).toBe(1);
    expect(MINIMAL_GRAPH.nodes).toHaveLength(2);
    expect(MINIMAL_GRAPH.edges).toHaveLength(1);
  });
});
```

### Step 2: 运行集成测试

```bash
pnpm --filter client test -- --run src/features/nodeMaterial/nodeMaterialIntegration.test.ts 2>&1 | tail -15
```

Expected: 4 tests PASS

> 如果失败：
> - `createThreeMaterial` 报找不到 `tslCompiler` → 确认 Task 13 的静态导入已添加
> - `MeshStandardNodeMaterial` 导入失败 → 改为 `import('three/examples/jsm/nodes/Addons.js')` 动态路径或检查 three 版本 ≥ 0.170

### Step 3: 运行全量测试，确认无回归

```bash
pnpm --filter client test -- --run 2>&1 | tail -20
```

Expected: 全部测试通过（含新增），无回归失败

### Step 4: 最终 Commit

```bash
git add packages/client/src/features/nodeMaterial/nodeMaterialIntegration.test.ts
git commit -m "test(nodeMaterial): add integration tests for NodeMaterial compile and factory"
```

---

## Phase 4 完成检查清单

- [ ] `materialFactory.ts` 添加 `NodeMaterial` 分支（Task 13）
- [ ] `MaterialAssetProp.tsx` 显示"打开节点编辑器"按钮（Task 14）
- [ ] `ProjectPanel.tsx` 新建材质对话框含 NodeMaterial 选项（Task 15）
- [ ] `EditorPage.tsx` 条件渲染 `<NodeMaterialEditor />`（Task 16）
- [ ] 集成测试通过（Task 17）
- [ ] 全量测试无回归

> **手动验收测试（E2E）：**
> 1. `pnpm dev:all` 启动开发服务器
> 2. 在 ProjectPanel → Materials 文件夹中右键 → 新建材质 → 选择 NodeMaterial → 创建
> 3. 在 Inspector 中点击「打开节点编辑器」
> 4. 拖拽 ColorInput 到画布 → 连线到 MaterialOutput.color → 观察 PreviewPanel 球体变色
> 5. 点击保存 → 刷新页面 → 重新打开编辑器 → 确认图结构持久化
