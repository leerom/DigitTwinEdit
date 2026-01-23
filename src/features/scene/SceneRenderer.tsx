import React, { useRef } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useEditorStore } from '@/stores/editorStore';
import { SceneObject, ObjectType } from '@/types';
import { ThreeEvent } from '@react-three/fiber';
import { Html, useHelper } from '@react-three/drei';
import * as THREE from 'three';

const DEFAULT_BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

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
    e.stopPropagation();

    if (e.delta > 2) return;

    // Force single selection
    // const isMultiSelect = e.ctrlKey || e.metaKey;
    select([id], false);
  };

  const { position, rotation, scale } = object.transform;

  const children = object.children.map((childId) => (
    <ObjectRenderer key={childId} id={childId} />
  ));

  const isWireframe = renderMode === 'wireframe';
  const showEdges = renderMode === 'hybrid';

  return (
    <group
      name={id} // Add name prop to allow finding object by ID
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={handleClick}
    >
      {object.type === ObjectType.MESH && (
        <mesh castShadow receiveShadow geometry={DEFAULT_BOX_GEOMETRY}>
          <meshStandardMaterial
            color={isSelected ? '#ff9900' : (object.components?.mesh?.materialId === 'default' ? 'orange' : '#cccccc')}
            emissive={isSelected ? '#442200' : '#000000'}
            wireframe={isWireframe}
          />
           {showEdges && (
              <lineSegments>
                <edgesGeometry args={[DEFAULT_BOX_GEOMETRY]} />
                <lineBasicMaterial color="black" />
              </lineSegments>
           )}
        </mesh>
      )}

      {object.type === ObjectType.CAMERA && (
        <group>
           <perspectiveCamera
             ref={cameraRef}
             fov={object.components?.camera?.fov ?? 50}
             near={object.components?.camera?.near ?? 0.1}
             far={object.components?.camera?.far ?? 1000}
           />
           <mesh>
             <boxGeometry args={[0.5, 0.5, 0.5]} />
             <meshBasicMaterial color="#8800ff" wireframe={isWireframe} />
           </mesh>
           <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
             <coneGeometry args={[0.2, 0.5, 16]} />
             <meshBasicMaterial color="#8800ff" wireframe={isWireframe} />
           </mesh>
        </group>
      )}

      {object.type === ObjectType.LIGHT && (
        <group>
          <directionalLight
            ref={lightRef}
            color={object.components?.light?.color ?? '#ffffff'}
            intensity={object.components?.light?.intensity ?? 1}
          />
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#ffff00" wireframe={isWireframe} />
          </mesh>
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

      {object.type === ObjectType.GROUP && (
        <group>
        </group>
      )}

      {children}
    </group>
  );
});

export const SceneContent: React.FC = () => {
  const rootId = useSceneStore((state) => state.scene.root);
  return <ObjectRenderer id={rootId} />;
};
