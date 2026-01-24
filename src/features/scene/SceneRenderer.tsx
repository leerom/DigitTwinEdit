import React, { useRef } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useEditorStore } from '@/stores/editorStore';
import { ObjectType } from '@/types';
import { ThreeEvent } from '@react-three/fiber';
import { useHelper } from '@react-three/drei';
import * as THREE from 'three';

const DEFAULT_BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

const ObjectRenderer: React.FC<{ id: string }> = React.memo(({ id }) => {
  const object = useSceneStore((state) => state.scene.objects[id]);

  const selectedIds = useEditorStore((state) => state.selectedIds);
  const select = useEditorStore((state) => state.select);
  const renderMode = useEditorStore((state) => state.renderMode);

  // Hooks must render unconditionally - DO NOT return null here before hooks

  const isSelected = selectedIds.includes(id);
  // const isActive = activeId === id;

  const lightRef = useRef<THREE.DirectionalLight>(null!);
  const cameraRef = useRef<THREE.Camera>(null!);

  // Safe access to object properties for hooks
  useHelper(isSelected && object?.type === ObjectType.LIGHT ? lightRef : null, THREE.DirectionalLightHelper, 1, 'yellow');
  useHelper(isSelected && object?.type === ObjectType.CAMERA ? cameraRef : null, THREE.CameraHelper);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (e.delta > 2) return;

    // Force single selection
    // const isMultiSelect = e.ctrlKey || e.metaKey;
    select([id], false);
  };

  const isWireframe = renderMode === 'wireframe';
  const showEdges = renderMode === 'hybrid';

  const geometry = React.useMemo(() => {
    if (!object || object.type !== ObjectType.MESH) return null;
    const geoType = object.components?.mesh?.geometry || 'box';

    switch (geoType) {
      case 'sphere': return new THREE.SphereGeometry(0.5, 32, 32);
      case 'plane': return new THREE.PlaneGeometry(1, 1);
      case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
      case 'capsule': return new THREE.CapsuleGeometry(0.5, 1, 4, 8);
      case 'torus': return new THREE.TorusGeometry(0.5, 0.2, 16, 100);
      case 'box':
      default: return DEFAULT_BOX_GEOMETRY;
    }
  }, [object?.type, object?.components?.mesh?.geometry]);

  // Now we can safely return null if object doesn't exist (deleted)
  if (!object) return null;

  const { position, rotation, scale } = object.transform || { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] };

  const children = object.children?.map((childId) => (
    <ObjectRenderer key={childId} id={childId} />
  )) || [];

  return (
    <group
      name={id} // Add name prop to allow finding object by ID
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={handleClick}
    >
      {object.type === ObjectType.MESH && geometry && (
        <mesh castShadow receiveShadow geometry={geometry}>
          <meshStandardMaterial
            color={isSelected ? '#ff9900' : (object.components?.mesh?.materialId === 'default' ? 'orange' : '#cccccc')}
            emissive={isSelected ? '#442200' : '#000000'}
            wireframe={isWireframe}
          />
           {showEdges && (
              <lineSegments>
                <edgesGeometry args={[geometry]} />
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
