import type { Command } from './Command';
import { useSceneStore } from '@/stores/sceneStore';
import type { MaterialSpec, MaterialType } from '@/types';
import { normalizeMaterialProps } from '@/features/materials/normalizeMaterialProps';

export class ChangeMaterialTypeCommand implements Command {
  name = 'Change Material Type';

  private objectId: string;
  private before: MaterialSpec | null = null;
  private after: MaterialSpec;

  constructor(objectId: string, nextType: MaterialType) {
    this.objectId = objectId;

    const scene = useSceneStore.getState().scene;
    const current = scene.objects[objectId]?.components?.mesh?.material;

    const currentProps = (current?.props ?? {}) as Record<string, unknown>;
    const nextProps = normalizeMaterialProps(currentProps, nextType);

    this.after = { type: nextType, props: nextProps };
    this.before = current ? JSON.parse(JSON.stringify(current)) : null;
  }

  execute() {
    useSceneStore.getState().updateMeshMaterialSpec(this.objectId, this.after);
  }

  undo() {
    if (!this.before) return;
    useSceneStore.getState().updateMeshMaterialSpec(this.objectId, this.before);
  }
}
