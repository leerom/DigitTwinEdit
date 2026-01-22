import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useEditorStore } from '@/stores/editorStore';

export const PanInput = () => {
  const { gl, camera } = useThree();
  const mode = useEditorStore((state) => state.mode);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Middle mouse button or Space key could trigger pan
      // But standard usually handles Shift + Left Drag as Pan or Middle Drag as Pan
      // OrbitControls handles Middle Drag = Pan by default usually.

      // Let's implement custom pan logic if needed, but OrbitControls might cover it.
      // Requirement T011 says: Implement view panning logic (Middle / Shift+Left)

      // OrbitControls defaults:
      // Left: Rotate
      // Right: Pan
      // Middle: Zoom (Dolly)

      // We want:
      // Middle: Pan
      // Shift+Left: Pan

      // We can configure OrbitControls in EditorControls.tsx instead of a separate input handler
      // unless we need "Q + Left Drag" as specified in docs.
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gl, camera, mode]);

  return null;
};
