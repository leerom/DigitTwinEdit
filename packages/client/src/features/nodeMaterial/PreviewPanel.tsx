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
        <meshStandardMaterial color="#6b7280" roughness={0.4} metalness={0.1} />
      )}
    </mesh>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Props { material: any | null; error: string | null }

export const PreviewPanel: React.FC<Props> = ({ material, error }) => (
  <div className="h-52 bg-black border-t border-border-dark relative shrink-0 flex flex-col">
    {/* 标题行 */}
    <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border-dark bg-panel-dark shrink-0">
      <span className="material-symbols-outlined text-[13px] text-slate-500">view_in_ar</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        预览
      </span>
    </div>

    {/* 3D Canvas */}
    <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
      <Canvas style={{ width: '100%', height: '100%' }} camera={{ position: [0, 0, 2.5] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} />
        <directionalLight position={[-2, -1, -2]} intensity={0.3} />
        <PreviewMesh material={material} />
        <OrbitControls enableZoom={false} />
      </Canvas>

      {/* 编译错误浮层 */}
      {error && (
        <div className="absolute inset-x-2 bottom-2 flex items-start gap-1.5 text-[10px] text-red-400 bg-red-950/80 border border-red-800/50 px-2 py-1.5 rounded backdrop-blur-sm">
          <span className="material-symbols-outlined text-[12px] shrink-0 mt-0.5">error</span>
          <span className="line-clamp-2 leading-relaxed">{error}</span>
        </div>
      )}
    </div>
  </div>
);
