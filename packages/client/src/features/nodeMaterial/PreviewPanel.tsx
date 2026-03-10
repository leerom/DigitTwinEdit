// packages/client/src/features/nodeMaterial/PreviewPanel.tsx
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { PreviewParams } from './hooks/usePreviewMaterial';

type PreviewShape = 'sphere' | 'box' | 'plane' | 'cylinder';

const SHAPES: { key: PreviewShape; icon: string; label: string }[] = [
  { key: 'sphere',   icon: 'circle',      label: '球体' },
  { key: 'box',      icon: 'square',      label: '立方体' },
  { key: 'plane',    icon: 'crop_square', label: '平面' },
  { key: 'cylinder', icon: 'contrast',    label: '圆柱' },
];

interface MeshProps {
  params: PreviewParams | null;
  shape: PreviewShape;
}

const PreviewMesh: React.FC<MeshProps> = ({ params, shape }) => {
  const color     = params?.color     ?? '#888888';
  const roughness = params?.roughness ?? 0.4;
  const metalness = params?.metalness ?? 0.1;
  const emissive  = params?.emissive  ?? '#000000';

  return (
    <mesh>
      {shape === 'box'      && <boxGeometry      args={[1.4, 1.4, 1.4]} />}
      {shape === 'plane'    && <planeGeometry     args={[2, 2]} />}
      {shape === 'cylinder' && <cylinderGeometry  args={[0.7, 0.7, 1.6, 32]} />}
      {shape === 'sphere'   && <sphereGeometry    args={[1, 32, 32]} />}
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive}
      />
    </mesh>
  );
};

interface Props { params: PreviewParams | null; error: string | null }

export const PreviewPanel: React.FC<Props> = ({ params, error }) => {
  const [shape, setShape] = useState<PreviewShape>('sphere');

  return (
    <div className="h-52 border-t border-border-dark relative shrink-0 flex flex-col">
      {/* 标题行 + 形状切换 */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border-dark bg-panel-dark shrink-0">
        <span className="material-symbols-outlined text-[13px] text-slate-500">view_in_ar</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 flex-1">
          预览
        </span>
        <div className="flex items-center gap-0.5">
          {SHAPES.map((s) => (
            <button
              key={s.key}
              title={s.label}
              onClick={() => setShape(s.key)}
              className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
                shape === s.key
                  ? 'bg-primary/20 text-primary'
                  : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">{s.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas 容器：相对定位包裹绝对定位的 Canvas，保证尺寸正确解析 */}
      <div className="relative flex-1" style={{ minHeight: 0 }}>
        <Canvas
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          gl={{ antialias: true }}
          camera={{ position: [0, 0, 2.5], fov: 45 }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#0c0e14']} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 2]} intensity={1.2} />
          <directionalLight position={[-2, -1, -2]} intensity={0.3} />
          <PreviewMesh params={params} shape={shape} />
          <OrbitControls enableZoom={false} makeDefault />
        </Canvas>

        {/* 编译错误浮层 */}
        {error && (
          <div className="absolute inset-x-2 bottom-2 flex items-start gap-1.5 text-[10px] text-red-400 bg-red-950/80 border border-red-800/50 px-2 py-1.5 rounded backdrop-blur-sm pointer-events-none">
            <span className="material-symbols-outlined text-[12px] shrink-0 mt-0.5">error</span>
            <span className="line-clamp-2 leading-relaxed">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
