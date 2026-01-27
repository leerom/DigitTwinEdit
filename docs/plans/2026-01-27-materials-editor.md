# Materials（材质）属性编辑 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为选中 Mesh 对象在 Inspector 中提供可切换材质类型与可编辑材质参数，并确保 Scene View 实时渲染更新且支持 Undo/Redo。

**Architecture:** 在 scene 数据模型中引入可序列化的 `MaterialSpec`（type + props 白名单），Inspector 编辑 spec，通过命令系统写入 store；渲染层将 spec 映射为 three.js `Material` 实例，类型切换时重建并 `dispose()`，属性更新时增量赋值并在必要场景设置 `material.needsUpdate = true`。

**Tech Stack:** Vite + React + TypeScript + Zustand + @react-three/fiber(three) + Vitest

---

## 前置说明（实现约束）

- 仅支持“单材质”（每个对象一个 material），不做 `material[]`。
- Materials 面板仅对 `ObjectType.MESH` 且单选时显示；Camera/Light 不显示。
- 新建对象默认材质类型：`MeshStandardMaterial`。
- 需要完整接入 `useHistoryStore`（Undo/Redo），并对 slider 连续变化使用 `merge()`。

## three.js / API 参考（Context7）

- 材质创建/更新示例（Standard/Physical，含 `needsUpdate` 用法）：来自 three.js 文档片段（Context7）。
- 材质在运行时修改：`MeshPhongMaterial` 的 `material.color.setHSL(...)`、`material.flatShading = true`。
- “哪些变更需要 `material.needsUpdate = true`”：参考 three.js `how-to-update-things` 文档片段（Context7 返回）。

> 关键结论：透明度、alphaTest、fog、vertexColors 等会导致 shader 变化，通常需要 `material.needsUpdate = true`。

---

### Task 1: 定义 MaterialSpec 类型（TDD）

**Files:**
- Modify: `src/types/index.ts`（新增 MaterialType/MaterialSpec 类型，并扩展 MeshComponent 支持 `material?: MaterialSpec` 或新增 `components.material`，以最终实现为准）
- Test: `src/types/materialSpec.test.ts`（若项目已有 types 测试模式则沿用；否则放到 `src/features/scene/...` 也可）

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';

describe('MaterialSpec types', () => {
  it('should allow supported material types', () => {
    const spec = { type: 'MeshStandardMaterial', props: {} };
    expect(spec.type).toBe('MeshStandardMaterial');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL（类型/路径不存在或 TS 报错）

**Step 3: Write minimal implementation**

在 `src/types/index.ts` 中新增：
- `MaterialType` 联合类型
- `MaterialSpec`（`type` + `props`）
- 在 `MeshComponent` 中新增字段：`material?: MaterialSpec`（推荐放 mesh 下，跟 geometry/materialId 同处）

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/index.ts src/types/materialSpec.test.ts
git commit -m "feat: add MaterialSpec schema"
```

---

### Task 2: 新建 Mesh 默认写入 MeshStandardMaterial

**Files:**
- Modify: `src/features/scene/services/SceneManager.ts:133-158`
- Test: `src/features/scene/services/SceneManager.test.ts`（如已有则修改；否则新建）

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { SceneManager } from './SceneManager';

describe('SceneManager.createMesh', () => {
  it('should create mesh with default MeshStandardMaterial spec', () => {
    const obj = SceneManager.createMesh('Cube', 'box');
    expect(obj.components?.mesh?.material?.type).toBe('MeshStandardMaterial');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL（material 未定义）

**Step 3: Write minimal implementation**

在 `SceneManager.createMesh` 返回的 `components.mesh` 中写入默认：
- `material: { type: 'MeshStandardMaterial', props: { color: '#cccccc', opacity: 1, transparent: false, wireframe: false, ... } }`

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/scene/services/SceneManager.ts src/features/scene/services/SceneManager.test.ts
git commit -m "feat: default mesh uses standard material"
```

---

### Task 3: 写 normalizeProps（类型切换 props 规范化）（TDD）

**Files:**
- Create: `src/features/materials/normalizeMaterialProps.ts`
- Test: `src/features/materials/normalizeMaterialProps.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { normalizeMaterialProps } from './normalizeMaterialProps';

describe('normalizeMaterialProps', () => {
  it('should keep common props and add Physical defaults', () => {
    const next = normalizeMaterialProps(
      { color: '#ff0000', roughness: 0.2, metalness: 0.3 },
      'MeshPhysicalMaterial'
    );
    expect(next.color).toBe('#ff0000');
    expect(next).toHaveProperty('clearcoat');
    expect(next).toHaveProperty('ior');
  });

  it('should drop unsupported props when switching to Basic', () => {
    const next = normalizeMaterialProps(
      { roughness: 0.2, metalness: 0.3, clearcoat: 1 },
      'MeshBasicMaterial'
    );
    expect(next).not.toHaveProperty('roughness');
    expect(next).not.toHaveProperty('clearcoat');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL（函数不存在）

**Step 3: Write minimal implementation**

实现：
- 定义每个材质类型的允许字段集合（白名单）
- 定义默认值（至少补齐 Physical 的 `clearcoat/clearcoatRoughness/ior/transmission/thickness` 等）
- 输出：合并“保留的通用字段 + 新类型默认字段”，并剔除不允许字段

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/materials/normalizeMaterialProps.ts src/features/materials/normalizeMaterialProps.test.ts
git commit -m "feat: add material props normalization"
```

---

### Task 4: 新增两个命令（ChangeMaterialTypeCommand / UpdateMaterialPropsCommand）（TDD）

**Files:**
- Create: `src/features/editor/commands/ChangeMaterialTypeCommand.ts`
- Create: `src/features/editor/commands/UpdateMaterialPropsCommand.ts`
- Test: `src/features/editor/commands/materialCommands.test.ts`
- Read: `src/features/editor/commands/Command.ts`（确认接口形态）
- Modify: `src/stores/sceneStore.ts`（添加更新 mesh.material 的 action，例如 `updateMeshMaterialSpec(id, spec)`）

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { useSceneStore } from '@/stores/sceneStore';
import { ChangeMaterialTypeCommand } from './ChangeMaterialTypeCommand';

describe('material commands', () => {
  it('should change type and undo', () => {
    const store = useSceneStore.getState();
    const id = store.addObject({ name: 'Cube' }) as any; // 按现有 addObject 行为调整

    const before = useSceneStore.getState().scene.objects[id].components.mesh.material.type;
    const cmd = new ChangeMaterialTypeCommand(id, 'MeshPhysicalMaterial');
    cmd.execute();
    expect(useSceneStore.getState().scene.objects[id].components.mesh.material.type).toBe('MeshPhysicalMaterial');

    cmd.undo();
    expect(useSceneStore.getState().scene.objects[id].components.mesh.material.type).toBe(before);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL（命令不存在 / store 不支持）

**Step 3: Write minimal implementation**

- 在 `sceneStore` 增加一个明确 action（只改 mesh.material spec，不动其它结构）。
- `ChangeMaterialTypeCommand`：存 before/after 快照，after 使用 `normalizeMaterialProps`。
- `UpdateMaterialPropsCommand`：存 before/after props，支持 merge（同 objectId + 时间窗口/同类型）。

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/stores/sceneStore.ts src/features/editor/commands/ChangeMaterialTypeCommand.ts src/features/editor/commands/UpdateMaterialPropsCommand.ts src/features/editor/commands/materialCommands.test.ts
git commit -m "feat: add undoable material commands"
```

---

### Task 5: 渲染层支持 MaterialSpec（增量更新 + 类型重建 + dispose）

**Files:**
- Modify: `src/features/scene/SceneRenderer.tsx:75-88`
- Create: `src/features/materials/materialFactory.ts`（`MaterialSpec -> THREE.Material`）
- Test: `src/features/materials/materialFactory.test.ts`（纯函数测试：映射/needsUpdate判定）

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createThreeMaterial } from './materialFactory';

describe('materialFactory', () => {
  it('should create MeshPhysicalMaterial when type is MeshPhysicalMaterial', () => {
    const m = createThreeMaterial({ type: 'MeshPhysicalMaterial', props: { color: '#ff0000' } });
    expect(m.type).toContain('MeshPhysicalMaterial');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL（工厂不存在）

**Step 3: Write minimal implementation**

- `createThreeMaterial(spec)`：switch type 创建对应 three material（参考 Context7：`new THREE.MeshStandardMaterial({ ... })` 等）
- `applyMaterialProps(material, props)`：只应用白名单字段；颜色使用 `material.color.set(...)`
- 在 `SceneRenderer.tsx` 中替换硬编码的 `<meshStandardMaterial ... />`：
  - 读取 `object.components.mesh.material`，生成/更新材质实例
  - `renderMode` 的 wireframe 与用户 wireframe 的关系：
    - wireframe 最终值 = `renderMode==='wireframe' || props.wireframe===true`
  - 选中高亮目前通过改 color/emissive，后续要避免覆盖用户颜色：
    - 先保持现状或改为 outline（本计划先保持简单：选中时仅覆盖 emissive，不覆盖 color）
- 在卸载/重建时 `dispose()`（材质 API：`material.dispose()`）

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/scene/SceneRenderer.tsx src/features/materials/materialFactory.ts src/features/materials/materialFactory.test.ts
git commit -m "feat: render meshes using MaterialSpec"
```

---

### Task 6: Inspector 材质 UI（类型下拉 + 动态字段 + 命令执行）

**Files:**
- Modify: `src/components/inspector/MaterialProp.tsx`（从静态展示改为可编辑表单）
- Modify: `src/components/panels/InspectorPanel.tsx:101-107`（增加 Light 排除：现在只排除 Camera，需排除 Light）
- (Optional) Create: `src/components/inspector/fields/*`（若项目已有类似输入组件则复用，不新增抽象）
- Test: `src/components/inspector/MaterialProp.test.tsx`（Vitest + RTL，若项目已有测试模式）

**Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MaterialProp } from './MaterialProp';

describe('MaterialProp', () => {
  it('shows material type selector', () => {
    render(<MaterialProp objectId="some-id" />);
    expect(screen.getByText(/MeshStandardMaterial|Standard/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL（当前 MaterialProp 是静态 UI，且依赖 store）

**Step 3: Write minimal implementation**

- 从 `useSceneStore` 读取对象与 `components.mesh.material`。
- 下拉选择：触发 `useHistoryStore.getState().execute(new ChangeMaterialTypeCommand(...))`
- 字段编辑：触发 `UpdateMaterialPropsCommand`（并 merge）
- 动态字段：按当前 `material.type` 渲染白名单字段（color/opacity/... + 各类型特有字段）
- 隐藏逻辑：
  - `InspectorPanel`：Materials 仅 `ObjectType.MESH && !isMultiSelect` 显示（并排除 Light/Camera）

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/inspector/MaterialProp.tsx src/components/panels/InspectorPanel.tsx src/components/inspector/MaterialProp.test.tsx
git commit -m "feat: add editable materials inspector"
```

---

### Task 7: 端到端手动验证 + 回归测试

**Files:**
- None

**Step 1: Run unit tests**

Run: `npm test`
Expected: PASS

**Step 2: Run build**

Run: `npm run build`
Expected: 构建成功

**Step 3: Manual test plan**

Run: `npm run dev`

- 添加 -> Cube
- 选中 Cube：Inspector 出现 Materials
- 切换材质类型：Standard ↔ Physical ↔ Phong ↔ Lambert ↔ Basic
- 修改：color/opacity/side/wireframe/roughness/metalness/clearcoat/ior 等，确认 SceneView 实时变化
- Undo/Redo：撤销/重做类型切换与 slider 修改
- 选中 Light/Camera：Materials 不显示

**Step 4: Commit（如有仅测试/小修）**

```bash
git status
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-01-27-materials-editor.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration

2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
