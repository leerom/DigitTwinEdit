import React, { useRef, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import * as THREE from 'three';

export const BoxSelector: React.FC = () => {
  const { gl, camera } = useThree();
  const select = useEditorStore((state) => state.select);
  const objects = useSceneStore((state) => state.scene.objects);
  const activeTool = useEditorStore((state) => state.activeTool); // Changed from mode to activeTool

  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const isSelecting = useRef(false);
  // Track modifier state at the start of drag
  const dragModifiers = useRef({ ctrl: false, alt: false, shift: false });

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
      // Only start box selection if left click and NOT Alt (Orbit)
      // activeTool must be 'hand' (Q) or specific selection tool if we separate them?
      // Requirement: "Left Drag draws selection box" usually implies Select Mode.
      // But if activeTool is 'translate', drag usually moves the gizmo.
      // If we miss the gizmo, we might want to box select? Or clear selection?
      // Standard behavior: If miss gizmo, drag background -> Box Select.
      // For now, let's allow it if activeTool is 'select' (which we mapped to 'hand' or default).
      // Actually 'hand' (Q) is for Panning (Left Drag).
      // So Box Select should probably happen when NOT in Hand mode, OR if we handle Q separately.
      // Wait, "Q - Grab Tool (Hand Tool): View Navigation".
      // So Q + Left Drag = Pan.
      // Box Select usually happens with a specific Select Tool or when no other tool consumes the drag.
      // If we are in W/E/R, dragging background usually rotates view (if no gizmo hit)? Or Box Selects?
      // Unity: Q=Pan, W=Move. In W, dragging background = Box Select. Alt+Drag = Rotate.
      // Let's implement: Left Drag = Box Select (unless Alt is pressed).

      if (e.button !== 0 || e.altKey) return;

      // Check if we are in Hand mode -> Pan, not Select
      if (activeTool === 'hand') return;

      // We start tracking
      startPoint.current = getMousePos(e);
      isSelecting.current = true;
      dragModifiers.current = { ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, shift: e.shiftKey };
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

    const onMouseUp = () => {
      if (isSelecting.current && selectionBox) {
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
  }, [gl, activeTool, selectionBox]);

  const performBoxSelection = () => {
    if (!selectionBox) return;

    const rect = gl.domElement.getBoundingClientRect();
    const startX = (selectionBox.x / rect.width) * 2 - 1;
    const startY = -((selectionBox.y / rect.height) * 2 - 1);
    const endX = ((selectionBox.x + selectionBox.w) / rect.width) * 2 - 1;
    const endY = -(((selectionBox.y + selectionBox.h) / rect.height) * 2 - 1);

    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);

    const newSelection: string[] = [];

    Object.values(objects).forEach((obj) => {
       if (obj.type === 'Group' || obj.id === 'root') return;

       const pos = new THREE.Vector3(...obj.transform.position);
       pos.project(camera);

       if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
         if (pos.z >= -1 && pos.z <= 1) {
            newSelection.push(obj.id);
         }
       }
    });

    if (newSelection.length > 0) {
      // Support modifiers:
      // Ctrl: Append
      // No modifier: Replace
      // (Alt logic for deselect usually requires checking intersection with current selection, handled by store if passed properly)
      // Here we just handle append via Ctrl.
      const shouldAppend = dragModifiers.current.ctrl || dragModifiers.current.shift; // Treat shift as append too for standard conventions?
      select(newSelection, shouldAppend);
    } else if (!dragModifiers.current.ctrl && !dragModifiers.current.shift) {
        // Clear selection if empty box and no append
        select([], false);
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
