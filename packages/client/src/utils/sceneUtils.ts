import { SceneObject } from '@/types';

export const hasCircularDependency = (
  objects: Record<string, SceneObject>,
  targetId: string,
  newParentId: string
): boolean => {
  let currentId: string | null = newParentId;

  while (currentId) {
    if (currentId === targetId) return true;
    currentId = objects[currentId]?.parentId || null;
  }

  return false;
};
