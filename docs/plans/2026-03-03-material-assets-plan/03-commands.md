# Task 4: BindMaterialAssetCommand

**Files:**
- Create: `packages/client/src/features/editor/commands/BindMaterialAssetCommand.ts`
- Create: `packages/client/src/features/editor/commands/BindMaterialAssetCommand.test.ts`

---

### Step 1: 先了解 Command 接口

参考：`packages/client/src/features/editor/commands/Command.ts`

Command 接口要求：`name: string`, `execute(): void`, `undo(): void`, 可选 `merge?(next: Command): boolean`。

### Step 2: 写失败测试

新建 `packages/client/src/features/editor/commands/BindMaterialAssetCommand.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BindMaterialAssetCommand } from './BindMaterialAssetCommand';
import { ObjectType } from '@/types';

// Mock sceneStore
const mockBindMaterialAsset = vi.fn();
vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: {
    getState: () => ({
      bindMaterialAsset: mockBindMaterialAsset,
      scene: {
        objects: {
          'mesh-1': {
            id: 'mesh-1',
            type: ObjectType.MESH,
            components: {
              mesh: {
                material: { type: 'MeshStandardMaterial', props: { color: '#cccccc' } },
                materialAssetId: 5,
              },
            },
          },
        },
      },
    }),
  },
}));

describe('BindMaterialAssetCommand', () => {
  beforeEach(() => {
    mockBindMaterialAsset.mockClear();
  });

  it('execute 时调用 bindMaterialAsset，参数正确', () => {
    const spec = { type: 'MeshStandardMaterial' as const, props: { color: '#ff0000' } };
    const cmd = new BindMaterialAssetCommand('mesh-1', 42, spec);

    cmd.execute();

    expect(mockBindMaterialAsset).toHaveBeenCalledWith('mesh-1', 42, spec);
  });

  it('undo 时恢复之前的 material 和 materialAssetId', () => {
    const spec = { type: 'MeshStandardMaterial' as const, props: { color: '#ff0000' } };
    const cmd = new BindMaterialAssetCommand('mesh-1', 42, spec);

    cmd.execute(); // 记录 prevMaterial 和 prevAssetId
    cmd.undo();

    expect(mockBindMaterialAsset).toHaveBeenLastCalledWith(
      'mesh-1',
      5, // prevAssetId
      { type: 'MeshStandardMaterial', props: { color: '#cccccc' } } // prevMaterial
    );
  });

  it('name 为"绑定材质资产"', () => {
    const cmd = new BindMaterialAssetCommand('mesh-1', 1, { type: 'MeshStandardMaterial', props: {} });
    expect(cmd.name).toBe('绑定材质资产');
  });
});
```

运行：`pnpm --filter client test -- --run src/features/editor/commands/BindMaterialAssetCommand.test.ts`

预期：`Cannot find module './BindMaterialAssetCommand'` 错误。

### Step 3: 实现 BindMaterialAssetCommand

新建 `packages/client/src/features/editor/commands/BindMaterialAssetCommand.ts`：

```typescript
import type { Command } from './Command';
import type { MaterialSpec } from '@/types';
import { useSceneStore } from '@/stores/sceneStore';

export class BindMaterialAssetCommand implements Command {
  readonly name = '绑定材质资产';

  private prevMaterial: MaterialSpec | undefined;
  private prevAssetId: number | undefined;

  constructor(
    private readonly objectId: string,
    private readonly assetId: number,
    private readonly spec: MaterialSpec
  ) {}

  execute(): void {
    const obj = useSceneStore.getState().scene.objects[this.objectId];
    this.prevMaterial = obj?.components?.mesh?.material;
    this.prevAssetId = obj?.components?.mesh?.materialAssetId;
    useSceneStore.getState().bindMaterialAsset(this.objectId, this.assetId, this.spec);
  }

  undo(): void {
    useSceneStore.getState().bindMaterialAsset(
      this.objectId,
      this.prevAssetId ?? 0,
      this.prevMaterial ?? { type: 'MeshStandardMaterial', props: {} }
    );
  }
}
```

### Step 4: 运行测试验证通过

```bash
pnpm --filter client test -- --run src/features/editor/commands/BindMaterialAssetCommand.test.ts
```

预期：全部 PASS。

### Step 5: Commit

```bash
git add packages/client/src/features/editor/commands/BindMaterialAssetCommand.ts \
        packages/client/src/features/editor/commands/BindMaterialAssetCommand.test.ts
git commit -m "feat(commands): 新建 BindMaterialAssetCommand（可撤销的材质资产绑定）"
```
