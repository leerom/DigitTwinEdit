import React, { useEffect, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { OrbitController } from './OrbitController';
import { FlyController } from './FlyController';
import { useThree } from '@react-three/fiber';

export const CameraSystem: React.FC = () => {
  const navigationMode = useEditorStore((state) => state.navigationMode);
  // Shared camera logic could go here if needed (e.g. saving state)

  return (
    <>
      <OrbitController enabled={navigationMode === 'orbit'} />
      <FlyController enabled={navigationMode === 'fly'} />
    </>
  );
};
