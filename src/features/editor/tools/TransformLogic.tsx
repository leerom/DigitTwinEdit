import React, { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import * as THREE from 'three';

export const TransformLogic: React.FC = () => {
  const mode = useEditorStore((state) => state.mode);
  const activeId = useEditorStore((state) => state.activeId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const objects = useSceneStore((state) => state.scene.objects);
  const updateTransform = useSceneStore((state) => state.updateTransform);

  const proxyRef = useRef<THREE.Object3D>(null);

  // If selecting multiple, we should calculate center.
  // For MVP: Single select support first.
  if (mode === 'select' || !activeId || !objects[activeId]) return null;

  const object = objects[activeId];
  if (object.locked) return null;

  return (
    <TransformControls
      object={proxyRef}
      mode={mode as 'translate' | 'rotate' | 'scale'}
      onObjectChange={(e) => {
        if (proxyRef.current) {
          const { position, rotation, scale } = proxyRef.current;
          // Update Store
          updateTransform(activeId, {
            position: [position.x, position.y, position.z],
            rotation: [rotation.x, rotation.y, rotation.z],
            scale: [scale.x, scale.y, scale.z],
          });
        }
      }}
      // Start/End for Undo/Redo history (later)
      onMouseDown={() => { /* Start Command */ }}
      onMouseUp={() => { /* Commit Command */ }}
    >
      <group
        ref={proxyRef}
        position={[...object.transform.position]}
        rotation={[...object.transform.rotation]}
        scale={[...object.transform.scale]}
      >
        {/* Invisible proxy or visible for debug? */}
        {/* We need it to NOT capture raycasts for selection? */}
        {/* TransformControls handles the gizmo rendering.
            This child is what the gizmo attaches to.
            It needs to exist in the scene.
        */}
      </group>
    </TransformControls>
  );
};
