# 01 数据模型变更

## 1. SceneObject 类型扩展

文件：`packages/client/src/types/index.ts`

```typescript
export interface MeshComponent {
  assetId: string;
  materialId: string;
  material?: MaterialSpec;
  geometry?: 'box' | 'sphere' | 'plane' | 'cylinder' | 'torus' | 'capsule';
  castShadow: boolean;
  receiveShadow: boolean;
  materialAssetId?: number;   // 新增：绑定的材质资产 DB ID（可选）
}
```

`materialAssetId` 为可选字段，未绑定资产时为 `undefined`，不影响现有场景数据。

---

## 2. 新建 useMaterialStore

文件：`packages/client/src/stores/materialStore.ts`

```typescript
import { create } from 'zustand';
import type { Asset } from '@digittwinedit/shared';
import type { MaterialSpec, MaterialType } from '@/types';
import { materialsApi } from '@/api/assets';

interface MaterialState {
  materials: Asset[];
  isLoading: boolean;
  saveError: string | null;
  selectedMaterialId: number | null;

  loadMaterials: (projectId: number) => Promise<void>;
  createMaterial: (projectId: number, name: string, type: MaterialType) => Promise<Asset>;
  duplicateMaterial: (materialId: number, projectId: number) => Promise<Asset>;
  renameMaterial: (materialId: number, name: string) => Promise<void>;
  deleteMaterial: (materialId: number) => Promise<void>;
  updateMaterialSpec: (materialId: number, patch: Partial<MaterialSpec>) => Promise<void>;
  selectMaterial: (id: number | null) => void;
  clearSaveError: () => void;
}
```

### 关键 action 实现逻辑

**createMaterial**
```
→ materialsApi.createMaterial(projectId, { name, type, properties: {} })
→ loadMaterials(projectId) 刷新列表
→ selectMaterial(newAsset.id)
```

**duplicateMaterial**
```
→ materialsApi.getMaterial(materialId)  获取源数据
→ materialsApi.createMaterial(projectId, { ...sourceData, name: `${name} 副本` })
→ loadMaterials(projectId)
```

**updateMaterialSpec**
```
→ materialsApi.updateMaterial(materialId, { properties: spec.props, type: spec.type })
→ 成功后：sceneStore.getState().syncMaterialAsset(materialId, spec)
→ 失败后：set({ saveError: '保存失败，请重试' })
```

---

## 3. sceneStore 新增 action

文件：`packages/client/src/stores/sceneStore.ts`（在现有 action 中追加）

```typescript
// 将材质资产绑定到场景对象（走命令系统，可撤销）
// 实际由 BindMaterialAssetCommand 调用
bindMaterialAsset: (objectId: string, assetId: number, spec: MaterialSpec) => void;

// 批量同步：更新所有引用了 assetId 的对象的 mesh.material（不走历史）
syncMaterialAsset: (assetId: number, spec: MaterialSpec) => void;
```

**syncMaterialAsset 实现**（使用 immer）：
```typescript
syncMaterialAsset: (assetId, spec) =>
  set(produce(state => {
    for (const obj of Object.values(state.scene.objects)) {
      if (obj.components?.mesh?.materialAssetId === assetId) {
        obj.components.mesh.material = spec;
      }
    }
  }))
```

---

## 4. BindMaterialAssetCommand（可撤销命令）

文件：`packages/client/src/features/editor/commands/BindMaterialAssetCommand.ts`

```typescript
export class BindMaterialAssetCommand implements Command {
  name = '绑定材质资产';
  private prevMaterial: MaterialSpec | undefined;
  private prevAssetId: number | undefined;

  constructor(
    private objectId: string,
    private assetId: number,
    private spec: MaterialSpec
  ) {}

  execute() {
    const obj = useSceneStore.getState().scene.objects[this.objectId];
    this.prevMaterial = obj?.components?.mesh?.material;
    this.prevAssetId = obj?.components?.mesh?.materialAssetId;
    useSceneStore.getState().bindMaterialAsset(this.objectId, this.assetId, this.spec);
  }

  undo() {
    // 恢复之前的 material 和 materialAssetId
    useSceneStore.getState().bindMaterialAsset(
      this.objectId,
      this.prevAssetId ?? 0,
      this.prevMaterial ?? { type: 'MeshStandardMaterial', props: {} }
    );
  }
}
```
