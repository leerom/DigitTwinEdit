# 三维对象属性补充 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 MESH 和 GROUP 对象新增阴影（产生/接收）、可见性、视锥体裁剪、渲染顺序 4 项属性，在 Inspector 中可编辑，并修复渲染器相关属性未生效的 Bug。

**Architecture:** 方案 A——按类型分存：MESH 扩展 `MeshComponent`（补充 `frustumCulled`/`renderOrder`，已有 `castShadow`/`receiveShadow`），GROUP 在 `SceneObject` 顶层新增同名可选字段；新建 `MeshProp.tsx` 组件（参考 `CameraProp` 模式）；修复 `SceneRenderer` 中的硬编码和 `visible` 不生效问题。

**Tech Stack:** React, TypeScript, @react-three/fiber, Zustand, Vitest + @testing-library/react

---

### Task 1: 扩展类型定义

**Files:**
- Modify: `packages/client/src/types/index.ts:30-38`（MeshComponent）
- Modify: `packages/client/src/types/index.ts:90-106`（SceneObject）

**Step 1: 在 MeshComponent 中添加两个新字段**

找到（约第 30 行）：
```typescript
export interface MeshComponent {
  assetId: string;
  materialId: string;
  material?: MaterialSpec;
  geometry?: 'box' | 'sphere' | 'plane' | 'cylinder' | 'torus' | 'capsule';
  castShadow: boolean;
  receiveShadow: boolean;
  materialAssetId?: number;
}
```

替换为：
```typescript
export interface MeshComponent {
  assetId: string;
  materialId: string;
  material?: MaterialSpec;
  geometry?: 'box' | 'sphere' | 'plane' | 'cylinder' | 'torus' | 'capsule';
  castShadow: boolean;
  receiveShadow: boolean;
  materialAssetId?: number;
  frustumCulled?: boolean;   // Three.js 视锥体裁剪，默认 true
  renderOrder?: number;      // Three.js 渲染顺序，默认 0
}
```

**Step 2: 在 SceneObject 中添加 GROUP 使用的可选字段**

找到（约第 90 行）：
```typescript
export interface SceneObject {
  id: string;
  name: string;
  type: ObjectType;
  parentId: string | null;
  children: string[];
  visible: boolean;
  locked: boolean;
  transform: TransformComponent;
  components?: {
```

替换为：
```typescript
export interface SceneObject {
  id: string;
  name: string;
  type: ObjectType;
  parentId: string | null;
  children: string[];
  visible: boolean;
  locked: boolean;
  castShadow?: boolean;      // GROUP 使用；MESH 用 MeshComponent.castShadow
  receiveShadow?: boolean;   // GROUP 使用；MESH 用 MeshComponent.receiveShadow
  frustumCulled?: boolean;   // GROUP 使用；MESH 用 MeshComponent.frustumCulled
  renderOrder?: number;      // GROUP 使用；MESH 用 MeshComponent.renderOrder
  transform: TransformComponent;
  components?: {
```

**Step 3: 验证编译无新错误**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -v "TS6133" | grep -v "TS6196" | grep "error TS" | head -20
```
预期：无输出（无新增错误）。

**Step 4: 提交**

```bash
git add packages/client/src/types/index.ts
git commit -m "feat(types): MeshComponent 新增 frustumCulled/renderOrder，SceneObject 新增 GROUP 渲染属性字段"
```

---

### Task 2: 修复 SceneRenderer — MESH 基础几何体

**Files:**
- Modify: `packages/client/src/features/scene/SceneRenderer.tsx`（约第 420 行）

**Step 1: 定位并替换 MESH 基础几何体的 `<mesh>` JSX**

找到（约第 420 行）：
```jsx
{object?.type === ObjectType.MESH && !object.components?.model && geometry && materialRef.current && (
  <mesh castShadow receiveShadow geometry={geometry} material={materialRef.current}>
```

替换为：
```jsx
{object?.type === ObjectType.MESH && !object.components?.model && geometry && materialRef.current && (
  <mesh
    castShadow={object.components?.mesh?.castShadow ?? true}
    receiveShadow={object.components?.mesh?.receiveShadow ?? true}
    frustumCulled={object.components?.mesh?.frustumCulled ?? true}
    renderOrder={object.components?.mesh?.renderOrder ?? 0}
    geometry={geometry}
    material={materialRef.current}
  >
```

**Step 2: 验证编译无新错误**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -v "TS6133" | grep -v "TS6196" | grep "error TS" | head -20
```
预期：无输出。

**Step 3: 提交**

```bash
git add packages/client/src/features/scene/SceneRenderer.tsx
git commit -m "fix(scene): MESH 几何体读取 MeshComponent 的 castShadow/receiveShadow/frustumCulled/renderOrder，修复硬编码"
```

---

### Task 3: 修复 SceneRenderer — ModelMesh 透传属性 + 外层 group 的 visible/GROUP 属性

**Files:**
- Modify: `packages/client/src/features/scene/SceneRenderer.tsx`（ModelMesh 调用处 + 外层 group）

**Step 1: 查看 ModelMesh 的 props 接口定义**

在 `SceneRenderer.tsx` 中找到 `ModelMesh` 组件定义，查看其 interface 中已有哪些 props（搜索 `interface ModelMeshProps` 或 `ModelMesh`）。

**Step 2: 给 ModelMesh 接口添加渲染属性 props**

找到 ModelMesh 的 props interface（大约在文件前半部分），添加：
```typescript
castShadow?: boolean;
receiveShadow?: boolean;
frustumCulled?: boolean;
renderOrder?: number;
```

**Step 3: 在 ModelMesh 内部遍历子 Mesh 时应用这些属性**

在 `ModelMesh` 组件内，找到遍历 scene 子节点并设置 wireframe 的 `useEffect`（关键词：`traverse`），在同一 `useEffect` 内补充：
```typescript
scene.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    child.castShadow = castShadow ?? true;
    child.receiveShadow = receiveShadow ?? true;
    child.frustumCulled = frustumCulled ?? true;
    child.renderOrder = renderOrder ?? 0;
    // ... 已有 wireframe 逻辑保持不变
  }
});
```

**Step 4: 在 ObjectRenderer 中将属性透传给 ModelMesh**

找到 `<ModelMesh` JSX 调用（约第 434 行），添加 4 个 props：
```jsx
<ModelMesh
  assetId={resolvedAssetId}
  assetUpdatedAt={assetUpdatedAt}
  materialSpec={materialSpec}
  renderMode={renderMode}
  activeSubNodePath={activeId === id ? activeSubNodePath : null}
  nodeOverrides={nodeOverrides}
  castShadow={object.components?.mesh?.castShadow ?? true}
  receiveShadow={object.components?.mesh?.receiveShadow ?? true}
  frustumCulled={object.components?.mesh?.frustumCulled ?? true}
  renderOrder={object.components?.mesh?.renderOrder ?? 0}
/>
```

**Step 5: 修复外层 `<group>` — 添加 visible 及 GROUP 渲染属性**

找到外层 `<group>` JSX（约第 411 行）：
```jsx
<group
  ref={groupRef}
  name={id}
  position={position}
  rotation={rotation}
  scale={scale}
  onClick={handleClick}
>
```

替换为：
```jsx
<group
  ref={groupRef}
  name={id}
  position={position}
  rotation={rotation}
  scale={scale}
  visible={object.visible}
  castShadow={object.castShadow}
  receiveShadow={object.receiveShadow}
  frustumCulled={object.frustumCulled ?? true}
  renderOrder={object.renderOrder ?? 0}
  onClick={handleClick}
>
```

> 注意：`visible` 在 MESH 和 GROUP 都生效（挂在 group 层面），同时修复了现有 visible 不生效的 Bug。GROUP 的 castShadow 等通过 Three.js 的 traverse 机制传递给子网格。

**Step 6: 验证编译无新错误**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -v "TS6133" | grep -v "TS6196" | grep "error TS" | head -20
```
预期：无输出。

**Step 7: 提交**

```bash
git add packages/client/src/features/scene/SceneRenderer.tsx
git commit -m "fix(scene): ModelMesh 透传阴影属性，外层 group 绑定 visible 及 GROUP 渲染属性"
```

---

### Task 4: Inspector UI — 先写测试（TDD）

**Files:**
- Create: `packages/client/src/components/inspector/specific/MeshProp.test.tsx`

**Step 1: 创建测试文件**

```typescript
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MeshProp } from './MeshProp';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType } from '@/types';

vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: vi.fn(),
}));

function setupMeshStore(meshProps: Record<string, unknown> = {}, objectProps: Record<string, unknown> = {}) {
  (useSceneStore as any).mockImplementation((selector: any) => {
    const state = {
      scene: {
        objects: {
          mesh1: {
            id: 'mesh1',
            type: ObjectType.MESH,
            visible: true,
            ...objectProps,
            components: {
              mesh: {
                castShadow: true,
                receiveShadow: true,
                ...meshProps,
              },
            },
          },
        },
      },
      updateComponent: vi.fn(),
      updateObject: vi.fn(),
    };
    return selector(state);
  });
}

function setupGroupStore(objectProps: Record<string, unknown> = {}) {
  (useSceneStore as any).mockImplementation((selector: any) => {
    const state = {
      scene: {
        objects: {
          group1: {
            id: 'group1',
            type: ObjectType.GROUP,
            visible: true,
            castShadow: false,
            receiveShadow: false,
            ...objectProps,
            components: {},
          },
        },
      },
      updateComponent: vi.fn(),
      updateObject: vi.fn(),
    };
    return selector(state);
  });
}

describe('MeshProp — MESH 对象', () => {
  beforeEach(() => {
    setupMeshStore();
  });

  it('显示"对象属性 (Object)"标题', () => {
    render(<MeshProp objectIds={['mesh1']} />);
    expect(screen.getByText('对象属性 (Object)')).toBeTruthy();
  });

  it('castShadow 默认 true 时 Checkbox 为选中', () => {
    render(<MeshProp objectIds={['mesh1']} />);
    // 阴影行应存在两个 checkbox（产生 + 接收）
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('修改 castShadow 时调用 updateComponent(mesh)', () => {
    const mockUpdateComponent = vi.fn();
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            mesh1: {
              id: 'mesh1',
              type: ObjectType.MESH,
              visible: true,
              components: { mesh: { castShadow: true, receiveShadow: true } },
            },
          },
        },
        updateComponent: mockUpdateComponent,
        updateObject: vi.fn(),
      };
      return selector(state);
    });
    render(<MeshProp objectIds={['mesh1']} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // 产生阴影 checkbox
    expect(mockUpdateComponent).toHaveBeenCalledWith('mesh1', 'mesh', expect.objectContaining({ castShadow: expect.any(Boolean) }));
  });

  it('修改 visible 时调用 updateObject', () => {
    const mockUpdateObject = vi.fn();
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            mesh1: {
              id: 'mesh1',
              type: ObjectType.MESH,
              visible: true,
              components: { mesh: { castShadow: true, receiveShadow: true } },
            },
          },
        },
        updateComponent: vi.fn(),
        updateObject: mockUpdateObject,
      };
      return selector(state);
    });
    render(<MeshProp objectIds={['mesh1']} />);
    // 找到可见性 checkbox（第3个 checkbox：产生、接收、可见性、视锥体裁剪）
    const checkboxes = screen.getAllByRole('checkbox');
    const visibleCheckbox = checkboxes[2]; // index 2 = 可见性
    fireEvent.click(visibleCheckbox);
    expect(mockUpdateObject).toHaveBeenCalledWith('mesh1', expect.objectContaining({ visible: expect.any(Boolean) }));
  });

  it('修改 renderOrder 时调用 updateComponent(mesh)', () => {
    const mockUpdateComponent = vi.fn();
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            mesh1: {
              id: 'mesh1',
              type: ObjectType.MESH,
              visible: true,
              components: { mesh: { castShadow: true, receiveShadow: true, renderOrder: 0 } },
            },
          },
        },
        updateComponent: mockUpdateComponent,
        updateObject: vi.fn(),
      };
      return selector(state);
    });
    render(<MeshProp objectIds={['mesh1']} />);
    const input = screen.getByDisplayValue('0'); // renderOrder 默认 0
    fireEvent.change(input, { target: { value: '5' } });
    expect(mockUpdateComponent).toHaveBeenCalledWith('mesh1', 'mesh', { renderOrder: 5 });
  });
});

describe('MeshProp — GROUP 对象', () => {
  beforeEach(() => {
    setupGroupStore();
  });

  it('GROUP 对象也显示"对象属性 (Object)"标题', () => {
    render(<MeshProp objectIds={['group1']} />);
    expect(screen.getByText('对象属性 (Object)')).toBeTruthy();
  });

  it('GROUP 修改 castShadow 时调用 updateObject（不是 updateComponent）', () => {
    const mockUpdateObject = vi.fn();
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            group1: {
              id: 'group1',
              type: ObjectType.GROUP,
              visible: true,
              castShadow: false,
              receiveShadow: false,
              components: {},
            },
          },
        },
        updateComponent: vi.fn(),
        updateObject: mockUpdateObject,
      };
      return selector(state);
    });
    render(<MeshProp objectIds={['group1']} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // 产生阴影
    expect(mockUpdateObject).toHaveBeenCalledWith('group1', expect.objectContaining({ castShadow: expect.any(Boolean) }));
  });
});
```

**Step 2: 运行测试确认失败（TDD Red 阶段）**

```bash
pnpm --filter client test -- --run src/components/inspector/specific/MeshProp.test.tsx
```
预期：FAIL（`MeshProp` 尚未实现）

**Step 3: 提交测试文件**

```bash
git add packages/client/src/components/inspector/specific/MeshProp.test.tsx
git commit -m "test(inspector): 添加 MeshProp TDD 测试"
```

---

### Task 5: Inspector UI — 实现 MeshProp.tsx

**Files:**
- Create: `packages/client/src/components/inspector/specific/MeshProp.tsx`

**Step 1: 创建 MeshProp.tsx**

```typescript
import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType, MeshComponent, SceneObject } from '@/types';
import { getCommonValue, MIXED_VALUE } from '../utils/inspectorUtils';
import { NumberInput } from '../common/NumberInput';
import { Checkbox } from '../common/Checkbox';

interface MeshPropProps {
  objectIds: string[];
}

export const MeshProp: React.FC<MeshPropProps> = ({ objectIds }) => {
  const objects = useSceneStore((state) => state.scene.objects);
  const updateComponent = useSceneStore((state) => state.updateComponent);
  const updateObject = useSceneStore((state) => state.updateObject);

  // 过滤有效的 MESH 和 GROUP 对象
  const selectedObjects = objectIds
    .map((id) => objects[id])
    .filter((obj) => obj && (obj.type === ObjectType.MESH || obj.type === ObjectType.GROUP));

  if (selectedObjects.length === 0) return null;

  const isMesh = (obj: SceneObject) => obj.type === ObjectType.MESH;

  // 从 MESH 的 MeshComponent 或 GROUP 的 SceneObject 顶层读取值
  const getObjectPropValue = (key: keyof SceneObject) => {
    const values = selectedObjects.map((obj) => obj[key]);
    const first = values[0];
    const isConsistent = values.every((v) => v === first);
    return isConsistent ? first : MIXED_VALUE;
  };

  const getMeshCompValue = (key: keyof MeshComponent) => {
    const values = selectedObjects.map((obj) => {
      if (isMesh(obj)) return obj.components?.mesh?.[key];
      // GROUP 读取 SceneObject 顶层同名字段
      return (obj as any)[key];
    });
    const definedValues = values.filter((v): v is NonNullable<typeof v> => v !== undefined);
    if (definedValues.length === 0) return undefined;
    if (definedValues.length !== selectedObjects.length) return MIXED_VALUE;
    return getCommonValue(definedValues);
  };

  const castShadow = getMeshCompValue('castShadow');
  const receiveShadow = getMeshCompValue('receiveShadow');
  const frustumCulled = getMeshCompValue('frustumCulled');
  const renderOrder = getMeshCompValue('renderOrder');
  const visible = getObjectPropValue('visible');

  // 更新：MESH 用 updateComponent，GROUP 用 updateObject
  const handleRenderPropUpdate = (key: string, value: unknown) => {
    selectedObjects.forEach((obj) => {
      if (isMesh(obj)) {
        updateComponent(obj.id, 'mesh', { [key]: value });
      } else {
        updateObject(obj.id, { [key]: value });
      }
    });
  };

  const handleVisibleUpdate = (val: boolean) => {
    selectedObjects.forEach((obj) => {
      updateObject(obj.id, { visible: val });
    });
  };

  return (
    <div className="flex flex-col gap-4 pl-0">
      <h3 className="text-[11px] font-bold text-slate-300">对象属性 (Object)</h3>

      {/* 阴影 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#999999] font-medium min-w-[60px]">阴影</span>
        <div className="flex space-x-4 w-full">
          <Checkbox
            label="产生"
            checked={castShadow === undefined ? true : castShadow as boolean | typeof MIXED_VALUE}
            onChange={(val) => handleRenderPropUpdate('castShadow', val)}
          />
          <Checkbox
            label="接收"
            checked={receiveShadow === undefined ? true : receiveShadow as boolean | typeof MIXED_VALUE}
            onChange={(val) => handleRenderPropUpdate('receiveShadow', val)}
          />
        </div>
      </div>

      {/* 可见性 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#999999] font-medium min-w-[60px]">可见性</span>
        <div className="w-full flex justify-start">
          <Checkbox
            checked={visible as boolean | typeof MIXED_VALUE}
            onChange={handleVisibleUpdate}
          />
        </div>
      </div>

      {/* 视锥体裁剪 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#999999] font-medium min-w-[60px]">视锥体裁剪</span>
        <div className="w-full flex justify-start">
          <Checkbox
            checked={frustumCulled === undefined ? true : frustumCulled as boolean | typeof MIXED_VALUE}
            onChange={(val) => handleRenderPropUpdate('frustumCulled', val)}
          />
        </div>
      </div>

      {/* 渲染顺序 */}
      <NumberInput
        label="渲染次序"
        value={renderOrder === undefined ? 0 : renderOrder as number | typeof MIXED_VALUE}
        onChange={(val) => handleRenderPropUpdate('renderOrder', val)}
        step="1"
      />
    </div>
  );
};
```

**Step 2: 运行测试确认全部通过**

```bash
pnpm --filter client test -- --run src/components/inspector/specific/MeshProp.test.tsx
```
预期：全部 PASS

**Step 3: 验证编译无新错误**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -v "TS6133" | grep -v "TS6196" | grep "error TS" | head -20
```
预期：无输出。

**Step 4: 提交**

```bash
git add packages/client/src/components/inspector/specific/MeshProp.tsx
git commit -m "feat(inspector): 新建 MeshProp 组件，显示 MESH/GROUP 的阴影/可见性/视锥体裁剪/渲染顺序"
```

---

### Task 6: 在 InspectorPanel 挂载 MeshProp

**Files:**
- Modify: `packages/client/src/components/panels/InspectorPanel.tsx`

**Step 1: 添加 MeshProp 导入**

在文件顶部导入区添加：
```typescript
import { MeshProp } from '../inspector/specific/MeshProp';
```

**Step 2: 在 Transform 区块后添加 MeshProp 区块**

找到（约第 242 行）：
```tsx
          {/* Camera Component */}
          {isAllCameras && (
            <div className="border-t border-white/5 pt-4">
                <CameraProp objectIds={selectedIds} />
            </div>
          )}
```

在其**之前**插入：
```tsx
          {/* Object Properties — MESH 和 GROUP */}
          {!isAllCameras && !isAllLights && (
            <div className="border-t border-white/5 pt-4">
              <MeshProp objectIds={selectedIds} />
            </div>
          )}
```

**Step 3: 验证编译无新错误**

```bash
pnpm --filter client exec tsc --noEmit 2>&1 | grep -v "TS6133" | grep -v "TS6196" | grep "error TS" | head -20
```
预期：无输出。

**Step 4: 提交**

```bash
git add packages/client/src/components/panels/InspectorPanel.tsx
git commit -m "feat(inspector): InspectorPanel 挂载 MeshProp，MESH/GROUP 对象显示对象属性区块"
```

---

## 验收标准

1. 选中 MESH 对象，Inspector 显示"对象属性 (Object)"区块（4 项属性）
2. 选中 GROUP 对象，同样显示该区块
3. 修改 castShadow/receiveShadow 后，3D 视口中阴影实时变化
4. 修改 visible 后，对象在 3D 视口中立即隐藏/显示
5. 修改 frustumCulled / renderOrder 后，Three.js 对象的对应属性更新
6. 所有 `MeshProp.test.tsx` 测试通过
7. 存量场景（无新字段）加载正常，默认值生效
