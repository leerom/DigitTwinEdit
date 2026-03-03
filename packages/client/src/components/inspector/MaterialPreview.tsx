import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMaterialStore } from '@/stores/materialStore';
import { createThreeMaterial } from '@/features/materials/materialFactory';

type ShapeType = 'sphere' | 'box' | 'plane';

const SHAPE_LABELS: Record<ShapeType, string> = {
  sphere: '球体',
  box: '立方体',
  plane: '平面',
};

const SHAPE_ICONS: Record<ShapeType, string> = {
  sphere: '●',
  box: '■',
  plane: '▬',
};

export const MaterialPreview: React.FC = () => {
  const [shape, setShape] = useState<ShapeType>('sphere');

  return (
    <div className="w-full">
      {/* 标题行 + 形状切换按钮 */}
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">预览</span>
        <div className="flex gap-1">
          {(['sphere', 'box', 'plane'] as ShapeType[]).map((s) => (
            <button
              key={s}
              title={SHAPE_LABELS[s]}
              onClick={() => setShape(s)}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                shape === s
                  ? 'border-primary text-primary'
                  : 'border-[#2d333f] text-slate-500 hover:text-white hover:border-slate-500'
              }`}
            >
              {SHAPE_ICONS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Three.js Canvas */}
      <div className="w-full h-[180px] rounded overflow-hidden bg-[#0c0e14] border border-border-dark">
        <Canvas
          frameloop="demand"
          camera={{ position: [0, 0, 3], fov: 45, near: 0.01, far: 1000 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} />
          <directionalLight position={[-2, -1, -2]} intensity={0.3} />
          <PreviewMesh shape={shape} />
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            enableRotate={true}
            makeDefault
          />
        </Canvas>
      </div>
      <p className="text-[9px] text-slate-600 text-center mt-1">左键旋转 · 滚轮缩放</p>
    </div>
  );
};

// ---- 内部组件（必须在 Canvas 内部使用）----

function PreviewMesh({ shape }: { shape: ShapeType }) {
  const previewSpec = useMaterialStore((s) => s.previewSpec);
  const { gl, invalidate } = useThree();

  const meshRef = useRef<THREE.Mesh | null>(null);
  const matRef = useRef<THREE.Material | null>(null);

  // 当 previewSpec 引用变化时重建材质并应用到当前 mesh
  useEffect(() => {
    const old = matRef.current;
    const newMat = previewSpec
      ? createThreeMaterial(previewSpec, gl)
      : new THREE.MeshStandardMaterial();
    matRef.current = newMat;
    old?.dispose();
    if (meshRef.current) {
      meshRef.current.material = newMat;
      invalidate();
    }
  }, [previewSpec, gl, invalidate]);

  // 组件卸载时释放材质
  useEffect(() => {
    return () => {
      matRef.current?.dispose();
      matRef.current = null;
    };
  }, []);

  // callback ref：mesh 挂载时（形状切换导致 mesh 重建）将当前材质赋给新 mesh
  const meshCallback = useCallback(
    (node: THREE.Mesh | null) => {
      meshRef.current = node;
      if (node) {
        if (!matRef.current) {
          matRef.current = new THREE.MeshStandardMaterial();
        }
        node.material = matRef.current;
        invalidate();
      }
    },
    [invalidate],
  );

  // 使用 key 强制 mesh 在形状切换时完整重建，确保 callback ref 被重新触发
  if (shape === 'sphere') {
    return (
      <mesh key="sphere" ref={meshCallback}>
        <sphereGeometry args={[0.8, 32, 32]} />
      </mesh>
    );
  }
  if (shape === 'box') {
    return (
      <mesh key="box" ref={meshCallback}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
      </mesh>
    );
  }
  return (
    <mesh key="plane" ref={meshCallback}>
      <planeGeometry args={[1.6, 1.6]} />
    </mesh>
  );
}
