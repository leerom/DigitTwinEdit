import React, { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid } from '@react-three/drei';
import { ViewGizmo } from '@/components/viewport/ViewGizmo';
import { SceneContent } from '@/features/scene/SceneRenderer';
import { BoxSelector } from '@/features/interaction/BoxSelector';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { useSceneConfig } from '@/features/scene/hooks/useSceneConfig';
import { InstanceManager } from '@/features/performance/InstanceManager';
import { ViewportOverlay } from '@/components/viewport/ViewportOverlay';
import { CameraSystem } from '@/features/editor/navigation/CameraSystem';
import { KeyboardShortcutManager } from '@/features/editor/shortcuts/KeyboardShortcutManager';
import { ActiveToolGizmo } from '@/features/editor/tools/ActiveToolGizmo'; // This will be created in next task, but good to add import if we stub it or wait

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

  return (
    <div
      className="w-full h-full relative bg-black"
      style={{ position: 'relative', cursor: cursorStyle }}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
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

        <Suspense fallback={null}>
          <SceneConfigApplier />
          <Environment preset="city" />

          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />

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
        </Suspense>
      </Canvas>

      <KeyboardShortcutManager />
      <ViewportOverlay />
    </div>
  );
};
