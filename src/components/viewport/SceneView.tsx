import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid } from '@react-three/drei';
// import { EditorControls } from '@/features/editor/controls/EditorControls';
// import { FlyControls } from '@/features/editor/controls/FlyControls';
// import { CameraActions } from '@/features/editor/controls/CameraActions';
import { ViewGizmo } from '@/components/viewport/ViewGizmo';
// import { CameraFollow } from '@/features/editor/controls/CameraFollow';
import { SceneContent } from '@/features/scene/SceneRenderer';
import { BoxSelector } from '@/features/interaction/BoxSelector';
// import { TransformGizmo } from '@/features/editor/tools/TransformGizmo';
import { useEditorStore } from '@/stores/editorStore';

import { InstanceManager } from '@/features/performance/InstanceManager';
import { ViewportOverlay } from '@/components/viewport/ViewportOverlay';

export const SceneView: React.FC = () => {
  const clearSelection = useEditorStore((state) => state.clearSelection);

  return (
    <div className="w-full h-full relative bg-black" style={{ position: 'relative' }}>
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
        {/* Removed PerformanceOverlay here, as it's now part of ViewportOverlay or handled differently */}

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

          {/* <EditorControls /> */}
          {/* <FlyControls /> */}
          {/* <CameraActions /> */}
          {/* <CameraFollow /> */}
          <ViewGizmo />
          <BoxSelector />
          {/* <TransformGizmo /> */}
          <InstanceManager />

          <SceneContent />
        </Suspense>
      </Canvas>

      {/* Overlay UI */}
      <ViewportOverlay />
    </div>
  );
};
