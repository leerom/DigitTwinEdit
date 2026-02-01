import { useSceneStore } from '@/stores/sceneStore';

export const exportSceneToJson = () => {
  const scene = useSceneStore.getState().scene;
  const json = JSON.stringify(scene, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `scene-${scene.id}.json`;
  link.click();
};
