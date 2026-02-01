import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useEditorStore } from '@/stores/editorStore';
import * as THREE from 'three';

export const RenderModeManager: React.FC = () => {
  const { scene } = useThree();
  const renderMode = useEditorStore((state) => state.renderMode);

  useEffect(() => {
    // Traverse scene and update materials based on mode
    // Note: This is a heavy operation if done every frame.
    // Ideally, we do it ONCE when mode changes.

    // Problem: New objects added need to respect current mode.
    // Solution:
    // 1. This component runs effect on `renderMode` change.
    // 2. SceneRenderer components should also subscribe to `renderMode` or use a shared material.
    //
    // For MVP/Simplicity:
    // We override materials globally in the scene traversal.

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
         // Save original material if not saved
         if (!obj.userData.originalMaterial) {
           obj.userData.originalMaterial = obj.material;
         }

         if (renderMode === 'wireframe') {
            obj.material = new THREE.MeshBasicMaterial({
              color: 0x00ff00, // Matrix style wireframe?
              wireframe: true,
            });
         } else if (renderMode === 'hybrid') {
             // Hybrid: Show shaded but with wireframe overlay?
             // Three.js doesn't support multi-material easily on single mesh without multi-pass.
             // Or we add a wireframe child.
             // For now, let's just use original material but with wireframe: true?
             // No, that makes it just wireframe.

             // Simple Hybrid: Original Material.
             // We rely on Selection to show wireframes?
             // Or we use `drei/Wireframe` component.

             obj.material = obj.userData.originalMaterial;
             // We'd need to attach a wireframe helper.
             // Let's skip complex hybrid for now and just restore original.
         } else {
             // Shaded
             obj.material = obj.userData.originalMaterial;
         }
      }
    });

  }, [renderMode, scene]); // Re-run when scene graph changes? Expensive.

  // Better approach:
  // Render modes should be handled by the SceneRenderer components individually.
  // They can read the store and choose which material to render.

  return null;
};
