import React, { useRef } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useEditorStore } from '@/stores/editorStore';
import { SceneObject, ObjectType } from '@/types';
import { ThreeEvent } from '@react-three/fiber';
import { Html, useHelper } from '@react-three/drei';
import * as THREE from 'three';

const ObjectRenderer: React.FC<{ id: string }> = React.memo(({ id }) => {
  const object = useSceneStore((state) => state.scene.objects[id]);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const select = useEditorStore((state) => state.select);
  const activeId = useEditorStore((state) => state.activeId);
  const renderMode = useEditorStore((state) => state.renderMode);

  const isSelected = selectedIds.includes(id);
  const isActive = activeId === id;

  const lightRef = useRef<THREE.DirectionalLight>(null!);
  const cameraRef = useRef<THREE.Camera>(null!);

  useHelper(isSelected && object?.type === ObjectType.LIGHT ? lightRef : null, THREE.DirectionalLightHelper, 1, 'yellow');
  useHelper(isSelected && object?.type === ObjectType.CAMERA ? cameraRef : null, THREE.CameraHelper);

  if (!object) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); // Prevent clicking through to background

    if (e.delta > 2) return; // Ignore drags

    const isMultiSelect = e.ctrlKey || e.metaKey;
    select([id], isMultiSelect);
  };

  const { position, rotation, scale } = object.transform;

  // Render children recursively
  const children = object.children.map((childId) => (
    <ObjectRenderer key={childId} id={childId} />
  ));

  // Determine Material Props based on Render Mode
  const isWireframe = renderMode === 'wireframe';
  const showEdges = renderMode === 'hybrid'; // Hybrid shows edges on top?

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={handleClick}
    >
      {object.type === ObjectType.MESH && (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={isSelected ? '#ff9900' : (object.components?.mesh?.materialId === 'default' ? 'orange' : '#cccccc')}
            emissive={isSelected ? '#442200' : '#000000'}
            wireframe={isWireframe}
          />
           {showEdges && (
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
                <lineBasicMaterial color="black" />
              </lineSegments>
           )}
        </mesh>
      )}

      {/* Camera Visualization */}
      {object.type === ObjectType.CAMERA && (
        <group>
           <perspectiveCamera
             ref={cameraRef}
             fov={object.components?.camera?.fov ?? 50}
             near={object.components?.camera?.near ?? 0.1}
             far={object.components?.camera?.far ?? 1000}
           />
           {/* Camera Icon - Purple Box */}
           <mesh>
             <boxGeometry args={[0.5, 0.5, 0.5]} />
             <meshBasicMaterial color="#8800ff" wireframe={isWireframe} />
           </mesh>
           {/* Arrow to show direction */}
           <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
             <coneGeometry args={[0.2, 0.5, 16]} />
             <meshBasicMaterial color="#8800ff" wireframe={isWireframe} />
           </mesh>
        </group>
      )}

      {/* Light Visualization */}
      {object.type === ObjectType.LIGHT && (
        <group>
          <directionalLight
            ref={lightRef}
            color={object.components?.light?.color ?? '#ffffff'}
            intensity={object.components?.light?.intensity ?? 1}
          />
          {/* Light Icon - Yellow Sphere */}
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#ffff00" wireframe={isWireframe} />
          </mesh>
          {/* Rays representation */}
           <group>
             {[0, Math.PI/2, Math.PI, -Math.PI/2].map((angle, i) => (
               <mesh key={i} rotation={[0, 0, angle]} position={[Math.cos(angle)*0.5, Math.sin(angle)*0.5, 0]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.4]} />
                  <meshBasicMaterial color="#ffff00" />
               </mesh>
             ))}
           </group>
        </group>
      )}

      {/* Visual helper for empty groups or non-mesh objects */}
      {object.type === ObjectType.GROUP && (
        <group>
            {/* Maybe a helper icon? */}
        </group>
      )}

      {children}
    </group>
  );
});

export const SceneContent: React.FC = () => {
  const rootId = useSceneStore((state) => state.scene.root);
  // We don't render root itself usually, or we do?
  // Root is a Group.
  return <ObjectRenderer id={rootId} />;
};
