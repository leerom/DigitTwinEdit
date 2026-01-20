import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import * as THREE from 'three';

export const CameraActions = () => {
  const { camera, controls } = useThree();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const objects = useSceneStore((state) => state.scene.objects);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus on selected object with 'F'
      if (e.code === 'KeyF') {
        if (selectedIds.length === 0) {
          // Reset to origin if nothing selected
           // @ts-ignore - OrbitControls type mismatch in drei vs three-stdlib
          if (controls) {
              const orbitControls = controls as any;
              orbitControls.target.set(0, 0, 0);
              camera.position.set(10, 10, 10);
              orbitControls.update();
          }
          return;
        }

        // Calculate bounding box of selected objects
        const box = new THREE.Box3();
        let hasValidObjects = false;

        selectedIds.forEach((id) => {
          const obj = objects[id];
          if (obj) {
            // In a real implementation, we would get the actual Mesh bounds.
            // Since we store transform in store, we can approximate with a point for now,
            // or we would need access to the scene graph object (THREE.Object3D).
            // Accessing THREE objects from ECS store is tricky without refs.
            //
            // "Correct" React-Three-Fiber way:
            // The components representing objects should register themselves or expose refs.
            // OR we can traverse the Scene Graph in the Three Context.

            // For MVP: Use store position.
            const { position } = obj.transform;
            box.expandByPoint(new THREE.Vector3(...position));
            hasValidObjects = true;
          }
        });

        if (hasValidObjects) {
          const center = new THREE.Vector3();
          box.getCenter(center);

          // @ts-ignore
          if (controls) {
             const orbitControls = controls as any;

             // Smoothly animate target
             // For now, snap to target
             orbitControls.target.copy(center);

             // Move camera to a reasonable distance
             // Simple approach: Keep current direction, just move closer/further?
             // Or fixed offset.

             const offset = new THREE.Vector3().subVectors(camera.position, orbitControls.target);
             const dist = Math.max(5, offset.length()); // Keep some distance
             offset.normalize().multiplyScalar(dist);

             camera.position.copy(center).add(offset);
             orbitControls.update();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, controls, selectedIds, objects]);

  return null;
};
