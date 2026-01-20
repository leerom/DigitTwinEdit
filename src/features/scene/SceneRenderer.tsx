import React, { useRef } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useEditorStore } from '@/stores/editorStore';
import { SceneObject, ObjectType } from '@/types';
import { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';

const ObjectRenderer: React.FC<{ id: string }> = React.memo(({ id }) => {
  const object = useSceneStore((state) => state.scene.objects[id]);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const select = useEditorStore((state) => state.select);
  const activeId = useEditorStore((state) => state.activeId);
  const renderMode = useEditorStore((state) => state.renderMode);

  const isSelected = selectedIds.includes(id);
  const isActive = activeId === id;

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

import * as THREE from 'three';


export const SceneContent: React.FC = () => {
  const rootId = useSceneStore((state) => state.scene.root);
  // We don't render root itself usually, or we do?
  // Root is a Group.
  return <ObjectRenderer id={rootId} />;
};
