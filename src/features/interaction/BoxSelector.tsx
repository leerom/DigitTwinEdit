import React, { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import * as THREE from 'three';

export const BoxSelector: React.FC = () => {
  const { gl, scene, camera } = useThree();
  const select = useEditorStore((state) => state.select);
  const objects = useSceneStore((state) => state.scene.objects);
  const mode = useEditorStore((state) => state.mode);

  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const isSelecting = useRef(false);

  // Helper to get mouse coords
  const getMousePos = (e: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseDown = (e: MouseEvent) => {
      // Only start box selection if left click and NOT Alt/Right/Middle
      // Also check if we hit a gizmo (Gizmo should stop propagation, but we are attaching to canvas)
      // If we clicked an object, SelectionManager handles it.
      // We need to differentiate "Click" vs "Drag Start".

      if (e.button !== 0 || e.altKey || mode !== 'select') return;

      // We start tracking, but only show box if dragged threshold exceeded
      startPoint.current = getMousePos(e);
      isSelecting.current = true;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isSelecting.current || !startPoint.current) return;

      const currentPos = getMousePos(e);
      const width = currentPos.x - startPoint.current.x;
      const height = currentPos.y - startPoint.current.y;

      // Threshold check
      if (Math.abs(width) < 5 && Math.abs(height) < 5) return;

      setSelectionBox({
        x: width > 0 ? startPoint.current.x : currentPos.x,
        y: height > 0 ? startPoint.current.y : currentPos.y,
        w: Math.abs(width),
        h: Math.abs(height),
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (isSelecting.current && selectionBox) {
        // Perform Frustum Selection
        performBoxSelection();
      }

      isSelecting.current = false;
      startPoint.current = null;
      setSelectionBox(null);
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [gl, mode, selectionBox]); // Dep on selectionBox is risky if it changes fast, but here it's for closure? No, useRefs cover state.

  const performBoxSelection = () => {
    if (!selectionBox) return;

    // 1. Convert 2D box to Normalized Device Coordinates (NDC)
    const rect = gl.domElement.getBoundingClientRect();
    const startX = (selectionBox.x / rect.width) * 2 - 1;
    const startY = -((selectionBox.y / rect.height) * 2 - 1);
    const endX = ((selectionBox.x + selectionBox.w) / rect.width) * 2 - 1;
    const endY = -(((selectionBox.y + selectionBox.h) / rect.height) * 2 - 1);

    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    // 2. Iterate all selectable objects and check if their center is inside the frustum
    // Ideally we check bounding box intersection with frustum.
    // Three.js has Frustum.setFromProjectionMatrix
    // But here we are in 2D Screen Space check for centers is easier for MVP.
    // Or we project object position to screen space.

    const newSelection: string[] = [];

    // Traverse Scene Store objects
    Object.values(objects).forEach((obj) => {
       if (obj.type === 'Group' || obj.id === 'root') return; // Skip groups/root? Depends on requirements. Usually leaf nodes.

       // Project position to screen
       const pos = new THREE.Vector3(...obj.transform.position);
       pos.project(camera); // map to -1 to 1

       if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
         // Also check z to ensure it's in front of camera?
         // pos.z is between -1 (near) and 1 (far)
         if (pos.z >= -1 && pos.z <= 1) {
            newSelection.push(obj.id);
         }
       }
    });

    if (newSelection.length > 0) {
      select(newSelection, false); // Replace selection? or Append if Shift?
      // Requirement: "Left Drag draws selection box"
      // Usually Shift+Drag adds to selection.
      // We can check shift key from last event or generic input state.
    }
  };

  if (!selectionBox) return null;

  return (
    <Html pointerEvents="none" fullscreen>
      <div
        style={{
          position: 'absolute',
          left: selectionBox.x,
          top: selectionBox.y,
          width: selectionBox.w,
          height: selectionBox.h,
          border: '1px solid #3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          pointerEvents: 'none',
        }}
      />
    </Html>
  );
};
