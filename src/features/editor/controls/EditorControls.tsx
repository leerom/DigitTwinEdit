import React, { useRef, useEffect, useState } from 'react';
import { OrbitControls as DreiOrbitControls } from '@react-three/drei';
import type { OrbitControls as ThreeOrbitControls } from 'three-stdlib';
import { useEditorStore } from '@/stores/editorStore';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const EditorControls: React.FC = () => {
  const controlsRef = useRef<ThreeOrbitControls>(null);
  const setCamera = useEditorStore((state) => state.setCamera);
  const { camera } = useThree();

  // Track modifier keys for custom navigation logic
  const [altPressed, setAltPressed] = useState(false);
  const [qPressed, setQPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltPressed(true);
      if (e.key.toLowerCase() === 'q') setQPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setAltPressed(false);
      if (e.key.toLowerCase() === 'q') setQPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Sync camera state to store on change
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleChange = () => {
      setCamera({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      });
    };

    controls.addEventListener('change', handleChange);
    return () => controls.removeEventListener('change', handleChange);
  }, [camera, setCamera]);

  // Dynamic Mouse Configuration
  // Standard Mode:
  // - Left Click: Select (Handled outside controls, controls should ignore if not navigating)
  // - Middle Click: Pan (Native MOUSE.PAN)
  // - Right Click: Context Menu (or Rotate if preferred, but docs say Alt+Left for Rotate)
  //
  // Custom Navigation Requirements:
  // - Alt + Left Drag: Rotate
  // - Q + Left Drag: Pan
  // - Middle Drag: Pan

  // To achieve this with OrbitControls:
  // We dynamically change mouseButtons prop based on key state.

  const mouseButtons = {
    LEFT: altPressed ? THREE.MOUSE.ROTATE : (qPressed ? THREE.MOUSE.PAN : undefined),
    MIDDLE: THREE.MOUSE.PAN,
    RIGHT: THREE.MOUSE.DOLLY, // Using Right for Zoom/Dolly as fallback or standard
  };

  return (
    <DreiOrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.5}
      zoomSpeed={0.7}
      panSpeed={0.6}
      minDistance={0.5}
      maxDistance={500}
      enableKeys={false}
      mouseButtons={mouseButtons as any}
      // If LEFT is undefined, it disables left click interaction on controls, allowing events to pass through to scene objects
    />
  );
};
