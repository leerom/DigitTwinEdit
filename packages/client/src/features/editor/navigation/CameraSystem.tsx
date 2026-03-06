import { useEditorStore } from '@/stores/editorStore';
import { OrbitController } from './OrbitController';
import { FlyController } from './FlyController';

export const CameraSystem = () => {
  const navigationMode = useEditorStore((state) => state.navigationMode);
  // Shared camera logic could go here if needed (e.g. saving state)

  return (
    <>
      <OrbitController enabled={navigationMode === 'orbit'} />
      <FlyController enabled={navigationMode === 'fly'} />
    </>
  );
};
