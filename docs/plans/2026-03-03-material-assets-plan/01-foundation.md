# Task 1–2: 数据模型扩展 + sceneStore 新 action

---

## Task 1: MeshComponent 增加 materialAssetId 字段

**Files:**
- Modify: `packages/client/src/types/index.ts`

### Step 1: 写失败测试（TS 类型检查）

此 Task 无运行时测试，用 TypeScript 编译验证。

运行：`pnpm --filter client exec tsc --noEmit`

记录当前是否已有错误（预期有若干已知 TS6133 unused variable 警告，属正常）。

### Step 2: 修改类型定义

在 `packages/client/src/types/index.ts` 的 `MeshComponent` 接口中新增字段：

```typescript
// 修改前（第 29–37 行）：
export interface MeshComponent {
  assetId: string;
  materialId: string;
  material?: MaterialSpec;
  geometry?: 'box' | 'sphere' | 'plane' | 'cylinder' | 'torus' | 'capsule';
  castShadow: boolean;
  receiveShadow: boolean;
}

// 修改后：
export interface MeshComponent {
  assetId: string;
  materialId: string;
  material?: MaterialSpec;
  geometry?: 'box' | 'sphere' | 'plane' | 'cylinder' | 'torus' | 'capsule';
  castShadow: boolean;
  receiveShadow: boolean;
  materialAssetId?: number;   // 绑定的材质资产 DB ID（可选）
}
```

### Step 3: 验证编译通过

运行：`pnpm --filter client exec tsc --noEmit`

预期：错误数不增加（与 Step 1 基线相同）。

### Step 4: Commit

```bash
git add packages/client/src/types/index.ts
git commit -m "feat(types): MeshComponent 增加 materialAssetId 可选字段"
```

---

## Task 2: sceneStore 新增三个 action

**Files:**
- Modify: `packages/client/src/stores/sceneStore.ts`
- Modify: `packages/client/src/stores/sceneStore.test.ts`（如果存在）或新建测试

### Step 1: 写失败测试

在 `packages/client/src/stores/sceneStore.test.ts` 末尾追加（如果文件不存在则新建）：

```typescript
// ── 材质资产绑定相关 action 测试 ──────────────────────────────────────────────

describe('bindMaterialAsset', () => {
  beforeEach(() => {
    // 重置 store
    useSceneStore.setState(useSceneStore.getInitialState?.() ?? { scene: defaultScene });
  });

  it('在目标对象的 mesh 组件上设置 materialAssetId 和 material', () => {
    // 先添加一个 Mesh 对象
    useSceneStore.getState().addObject({
      id: 'test-mesh',
      type: ObjectType.MESH,
      name: 'Test Mesh',
      components: {
        mesh: { assetId: '', materialId: '', castShadow: false, receiveShadow: false },
      },
    });

    const spec: MaterialSpec = { type: 'MeshStandardMaterial', props: { color: '#ff0000' } };
    useSceneStore.getState().bindMaterialAsset('test-mesh', 42, spec);

    const obj = useSceneStore.getState().scene.objects['test-mesh'];
    expect(obj.components?.mesh?.materialAssetId).toBe(42);
    expect(obj.components?.mesh?.material).toEqual(spec);
  });

  it('assetId 为 0 时清除 materialAssetId', () => {
    useSceneStore.getState().addObject({
      id: 'test-mesh-2',
      type: ObjectType.MESH,
      name: 'Test Mesh 2',
      components: {
        mesh: { assetId: '', materialId: '', castShadow: false, receiveShadow: false, materialAssetId: 99 },
      },
    });

    const spec: MaterialSpec = { type: 'MeshStandardMaterial', props: {} };
    useSceneStore.getState().bindMaterialAsset('test-mesh-2', 0, spec);

    const obj = useSceneStore.getState().scene.objects['test-mesh-2'];
    expect(obj.components?.mesh?.materialAssetId).toBeUndefined();
  });
});

describe('syncMaterialAsset', () => {
  it('更新所有引用该资产 ID 的对象的 mesh.material', () => {
    const spec1: MaterialSpec = { type: 'MeshStandardMaterial', props: { color: '#aabbcc' } };
    useSceneStore.getState().addObject({
      id: 'obj-a',
      type: ObjectType.MESH,
      name: 'Obj A',
      components: { mesh: { assetId: '', materialId: '', castShadow: false, receiveShadow: false, materialAssetId: 10, material: spec1 } },
    });
    useSceneStore.getState().addObject({
      id: 'obj-b',
      type: ObjectType.MESH,
      name: 'Obj B',
      components: { mesh: { assetId: '', materialId: '', castShadow: false, receiveShadow: false, materialAssetId: 99 } },
    });

    const newSpec: MaterialSpec = { type: 'MeshStandardMaterial', props: { color: '#ffffff' } };
    useSceneStore.getState().syncMaterialAsset(10, newSpec);

    expect(useSceneStore.getState().scene.objects['obj-a'].components?.mesh?.material).toEqual(newSpec);
    // obj-b 不受影响（assetId 不同）
    expect(useSceneStore.getState().scene.objects['obj-b'].components?.mesh?.material).toBeUndefined();
  });
});

describe('clearMaterialAssetRefs', () => {
  it('清除所有引用指定资产 ID 的 materialAssetId', () => {
    useSceneStore.getState().addObject({
      id: 'obj-c',
      type: ObjectType.MESH,
      name: 'Obj C',
      components: { mesh: { assetId: '', materialId: '', castShadow: false, receiveShadow: false, materialAssetId: 55 } },
    });

    useSceneStore.getState().clearMaterialAssetRefs(55);

    expect(useSceneStore.getState().scene.objects['obj-c'].components?.mesh?.materialAssetId).toBeUndefined();
  });
});
```

运行：`pnpm --filter client test -- --run src/stores/sceneStore.test.ts`

预期：`bindMaterialAsset is not a function` 等错误。

### Step 2: 在 sceneStore.ts 中声明三个新 action

在 `SceneState` interface（约第 18–50 行）中追加：

```typescript
// 材质资产绑定 actions
bindMaterialAsset: (objectId: string, assetId: number, spec: MaterialSpec) => void;
syncMaterialAsset: (assetId: number, spec: MaterialSpec) => void;
clearMaterialAssetRefs: (assetId: number) => void;
```

### Step 3: 在 immer set 区块中实现三个 action

在现有最后一个 action 之后追加（注意维持逗号分隔）：

```typescript
bindMaterialAsset: (objectId, assetId, spec) =>
  set((state) => {
    const obj = state.scene.objects[objectId];
    if (!obj?.components?.mesh) return;
    obj.components.mesh.material = spec;
    if (assetId === 0) {
      delete obj.components.mesh.materialAssetId;
    } else {
      obj.components.mesh.materialAssetId = assetId;
    }
    state.scene.updatedAt = new Date().toISOString();
    state.isDirty = true;
  }),

syncMaterialAsset: (assetId, spec) =>
  set((state) => {
    for (const obj of Object.values(state.scene.objects)) {
      if (obj.components?.mesh?.materialAssetId === assetId) {
        obj.components.mesh.material = spec;
      }
    }
    state.scene.updatedAt = new Date().toISOString();
    state.isDirty = true;
  }),

clearMaterialAssetRefs: (assetId) =>
  set((state) => {
    for (const obj of Object.values(state.scene.objects)) {
      if (obj.components?.mesh?.materialAssetId === assetId) {
        delete obj.components.mesh.materialAssetId;
      }
    }
    state.scene.updatedAt = new Date().toISOString();
    state.isDirty = true;
  }),
```

### Step 4: 运行测试验证通过

```bash
pnpm --filter client test -- --run src/stores/sceneStore.test.ts
```

预期：新增的三组测试全部 PASS。

### Step 5: Commit

```bash
git add packages/client/src/stores/sceneStore.ts
git commit -m "feat(sceneStore): 增加 bindMaterialAsset / syncMaterialAsset / clearMaterialAssetRefs action"
```
