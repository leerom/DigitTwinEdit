import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useEditorStore } from '@/stores/editorStore';
import * as THREE from 'three';

export const SelectionManager: React.FC = () => {
  const { camera, scene, gl } = useThree();
  const select = useEditorStore((state) => state.select);
  const deselect = useEditorStore((state) => state.deselect);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const mode = useEditorStore((state) => state.mode);

  useEffect(() => {
    // Only handle selection in 'select' mode or when not using a Transform Tool that consumes input.
    // Actually, typical editor behavior allows selection even when Move tool is active,
    // AS LONG AS we didn't click ON the Gizmo.
    // The Gizmo usually stops propagation if hit.
    // So we just attach a click handler to the canvas.

    const handleClick = (e: MouseEvent) => {
      // Ignore if we are dragging (simple check: mouse down position vs mouse up)
      // We'll rely on a simple `click` event for now.
      // But we need to check if the click was on UI or Canvas.
      // The event listener is attached to the window or canvas?
      // R3F events system handles clicks on objects mostly.
      // But we want to handle "Click on Empty Space" -> Deselect All.
    };

    // Better approach: Use R3F's `onPointerMissed` on the <Canvas> or a global handler.
    // But `onPointerMissed` doesn't give us the event modifiers (Ctrl/Shift) easily in all versions?
    // It receives the MouseEvent.

    return () => {};
  }, []);

  return (
    <group
      onClick={(e) => {
        // e.stopPropagation(); // Stop bubbling to parent?
        // In R3F, bubbling goes up the Scene Graph.
        // We want to catch clicks on objects.
        // BUT, we have a problem: The objects are generated from SceneStore data.
        // This component (SelectionManager) is just a manager.
        // We need a way to attach onClick to ALL objects.
        // OR we use a global raycaster here.
      }}
      onPointerMissed={(e) => {
        // Clicked on background
        if (e.type === 'click' && !e.ctrlKey && !e.shiftKey) {
           clearSelection();
        }
      }}
    >
      {/* This component doesn't render objects. It just manages logic?
          Actually, we need a component that Renders the SceneStore objects AND attaches events.
          Let's call it `SceneObjectRenderer` or just put it in `SceneView`.
      */}
    </group>
  );
};
