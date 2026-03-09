import React, { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { ViewGizmo } from '@/components/viewport/ViewGizmo';
import { SceneContent } from '@/features/scene/SceneRenderer';
import { BoxSelector } from '@/features/interaction/BoxSelector';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { useSceneConfig } from '@/features/scene/hooks/useSceneConfig';
import { SceneEnvironment } from '@/features/scene/components/SceneEnvironment';
import { InstanceManager } from '@/features/performance/InstanceManager';
import { ViewportOverlay } from '@/components/viewport/ViewportOverlay';
import { CameraSystem } from '@/features/editor/navigation/CameraSystem';
import { KeyboardShortcutManager } from '@/features/editor/shortcuts/KeyboardShortcutManager';
import { ActiveToolGizmo } from '@/features/editor/tools/ActiveToolGizmo'; // This will be created in next task, but good to add import if we stub it or wait
import { PostProcessingSystem } from '@/features/postprocessing/PostProcessingSystem';
import * as THREE from 'three';
import { clsx } from 'clsx';
import { threeContextRef, ThreeContextCapture } from '@/features/viewport/threeContext';
import { useAssetDrop } from '@/hooks/useAssetDrop';

// SceneConfigApplier component to use hooks inside Canvas
const SceneConfigApplier: React.FC = () => {
  const scene = useSceneStore((state) => state.scene);
  useSceneConfig(scene);
  return null;
};

export const SceneView: React.FC = () => {
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const setNavigationMode = useEditorStore((state) => state.setNavigationMode);
  const viewMode = useEditorStore((state) => state.viewMode);
  const activeTool = useEditorStore((state) => state.activeTool);

  // Handle Right Click for Fly Mode
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // If Hand Tool is active, do NOT enter Fly Mode on right click
    // Let OrbitControls handle panning (Right Click = Pan by default)
    if (activeTool === 'hand') return;

    if (e.button === 2 && viewMode === '3D') { // Right Click
      setNavigationMode('fly');
      e.currentTarget.requestPointerLock();
    }
  }, [setNavigationMode, viewMode, activeTool]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) {
      setNavigationMode('orbit');
      document.exitPointerLock();
    }
  }, [setNavigationMode]);

  // Dynamic cursor style based on active tool
  const cursorStyle = activeTool === 'hand' ? 'grab' : 'default';

  const getSceneDropPosition = useCallback(
    (e: React.DragEvent<HTMLElement>): [number, number, number] => {
      const camera = threeContextRef.camera;
      if (!camera) return [0, 0, 0];

      const rect = e.currentTarget.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const target = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(groundPlane, target);

      if (!hit) return [0, 0, 0];
      return [target.x, 0, target.z];
    },
    []
  );

  const { isDraggingOver, onDragOver, onDragLeave, onDrop } = useAssetDrop(getSceneDropPosition);

  return (
    <div
      className={clsx(
        'w-full h-full relative bg-black',
        isDraggingOver && 'ring-2 ring-inset ring-blue-400'
      )}
      style={{ position: 'relative', cursor: cursorStyle }}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 3D Canvas */}
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [10, 10, 10], fov: 50 }}
        dpr={[1, 2]}
        onPointerMissed={(e) => {
           if (e.type === 'click' && !e.ctrlKey && !e.shiftKey) {
             clearSelection();
           }
        }}
        className="block absolute inset-0"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#1e1e1e']} />
        <ThreeContextCapture />

        <Suspense fallback={null}>
          <SceneConfigApplier />
          <SceneEnvironment />

          <Grid
            infiniteGrid
            fadeDistance={50}
            fadeStrength={5}
            cellColor="#444"
            sectionColor="#666"
            sectionSize={3}
            cellSize={1}
          />

          <CameraSystem />
          <ViewGizmo />
          <BoxSelector />
          <InstanceManager />
          <SceneContent />
          <ActiveToolGizmo />
          <PostProcessingSystem />
        </Suspense>
      </Canvas>

      <KeyboardShortcutManager />
      <ViewportOverlay />
    </div>
  );
};
