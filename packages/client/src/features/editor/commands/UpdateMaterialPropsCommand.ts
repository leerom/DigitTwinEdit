import type { Command } from './Command';
import { useSceneStore } from '@/stores/sceneStore';
import type { MaterialSpec, MaterialType } from '@/types';

export class UpdateMaterialPropsCommand implements Command {
  name = 'Update Material Props';

  private objectId: string;
  private before: MaterialSpec | null;
  private after: MaterialSpec;

  constructor(objectId: string, nextProps: Record<string, unknown>) {
    this.objectId = objectId;

    const scene = useSceneStore.getState().scene;
    const current = scene.objects[objectId]?.components?.mesh?.material;

    const currentType: MaterialType = (current?.type ?? 'MeshStandardMaterial') as MaterialType;
    const currentProps = (current?.props ?? {}) as Record<string, unknown>;

    this.before = current ? JSON.parse(JSON.stringify(current)) : null;
    this.after = { type: currentType, props: { ...currentProps, ...nextProps } };
  }

  execute() {
    useSceneStore.getState().updateMeshMaterialSpec(this.objectId, this.after);
  }

  undo() {
    if (!this.before) return;
    useSceneStore.getState().updateMeshMaterialSpec(this.objectId, this.before);
  }

  merge(next: Command): boolean {
    if (!(next instanceof UpdateMaterialPropsCommand)) return false;
    if (next.objectId !== this.objectId) return false;

    // 合并策略：只更新 after（undo 仍回到最初 before）
    this.after = next.after;
    return true;
  }
}
