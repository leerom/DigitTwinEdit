import { useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import * as THREE from 'three';

export const CameraFollow = () => {
  const { camera, controls } = useThree();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const objects = useSceneStore((state) => state.scene.objects);
  const activeId = useEditorStore((state) => state.activeId);

  // Simple follow: if one object is selected and we hold Shift+F?
  // Requirement says: "Shift+F lock follow object"

  // We need a state to track if we are locking
  // But this state should probably be in the store if we want UI feedback.
  // For now, local state or valid ref is enough for MVP logic.

  // Let's assume we don't have a "isFollowing" boolean in store yet.
  // We can just implement "Frame" behavior every frame if a flag is set.
  // But without UI toggle, it's hidden.

  // Requirement FR-034: "Shift+F to lock follow"
  // Let's add a local ref to track the followed object ID.
  const followedId = React.useRef<string | null>(null);
  const offset = React.useRef(new THREE.Vector3());

  // Listen for Toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyF' && e.shiftKey) {
        if (followedId.current) {
          // Unlock
          followedId.current = null;
          console.log('Camera Follow: Unlocked');
        } else if (activeId) {
          // Lock
          followedId.current = activeId;
          // Calculate current offset
          const obj = objects[activeId];
          if (obj) {
             const targetPos = new THREE.Vector3(...obj.transform.position);
             offset.current.subVectors(camera.position, targetPos);
             console.log('Camera Follow: Locked to ' + obj.name);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeId, camera, objects]);

  // Update loop
  useFrame(() => {
    if (followedId.current) {
      const obj = objects[followedId.current];
      if (obj && controls) {
        const targetPos = new THREE.Vector3(...obj.transform.position);

        // Update Controls Target
        // @ts-ignore
        const orbit = controls as any;
        orbit.target.copy(targetPos);

        // Maintain relative camera position (offset)
        // camera.position.copy(targetPos).add(offset.current);
        // Actually, OrbitControls handles the position if we update target?
        // No, OrbitControls rotates AROUND target.
        // If we move target, we should also move camera to keep distance?
        // Yes, if we want "Follow".

        camera.position.copy(targetPos).add(offset.current);
        orbit.update();
      } else {
        // Object lost
        followedId.current = null;
      }
    } else {
        // Update offset if we are just navigating (optional, to keep offset fresh if we re-lock)
        // Not strictly needed unless we want to "resume" follow from new angle.
    }
  });

  return null;
};

import React from 'react';
