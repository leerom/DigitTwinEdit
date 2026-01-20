import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid } from '@react-three/drei';
import { EditorControls } from '@/features/editor/controls/EditorControls';
import { FlyControls } from '@/features/editor/controls/FlyControls';
import { CameraActions } from '@/features/editor/controls/CameraActions';
import { ViewGizmo } from '@/components/viewport/ViewGizmo';
import { CameraFollow } from '@/features/editor/controls/CameraFollow';
import { SceneContent } from '@/features/scene/SceneRenderer';
import { BoxSelector } from '@/features/interaction/BoxSelector';
import { TransformGizmo } from '@/features/editor/tools/TransformGizmo';
import { useEditorStore } from '@/stores/editorStore';

import { Toolbar } from '@/components/layout/Toolbar';

import { InstanceManager } from '@/features/performance/InstanceManager';
import { PerformanceOverlay } from '@/components/viewport/PerformanceOverlay';

export const SceneView: React.FC = () => {
  const clearSelection = useEditorStore((state) => state.clearSelection);

  return (
    <div className="w-full h-full relative">
      <Toolbar />
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
      >
        <color attach="background" args={['#1a1a1a']} />
        <PerformanceOverlay />


        <Suspense fallback={null}>
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

          <EditorControls />
          <FlyControls />
          <CameraActions />
          <CameraFollow />
          <ViewGizmo />
          <BoxSelector />
          <TransformGizmo />
          <InstanceManager />

          <SceneContent />
        </Suspense>
      </Canvas>

      {/* Overlay UI (Stats, Gizmos, etc.) will go here */}
      <div className="absolute top-4 right-4 text-white text-xs opacity-50 pointer-events-none">
        Scene View MVP
      </div>
    </div>
  );
};
