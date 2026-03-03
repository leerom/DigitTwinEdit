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
