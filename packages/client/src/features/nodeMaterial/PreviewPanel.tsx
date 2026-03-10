// packages/client/src/features/nodeMaterial/PreviewPanel.tsx
import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PreviewMesh: React.FC<{ material: any | null }> = ({ material }) => {
  const ref = useRef<THREE.Mesh>(null);
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      {material ? (
        <primitive object={material} attach="material" />
      ) : (
        <meshStandardMaterial color="#888888" roughness={0.5} metalness={0.1} />
      )}
    </mesh>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { material: any | null; error: string | null }

export const PreviewPanel: React.FC<Props> = ({ material, error }) => (
  <div className="h-48 bg-black border-t border-[#2d333f] relative shrink-0">
    <Canvas camera={{ position: [0, 0, 3] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 2]} intensity={1} />
      <PreviewMesh material={material} />
      <OrbitControls enableZoom={false} />
    </Canvas>
    {error && (
      <div className="absolute bottom-1 left-1 right-1 text-[10px] text-red-400 bg-red-900/30 px-2 py-0.5 rounded truncate">
        {error}
      </div>
    )}
  </div>
);
