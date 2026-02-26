import React, { useMemo, useEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Asset } from '@digittwinedit/shared';
import { assetsApi } from '../../api/assets.js';
import { findNodeByPath } from '../assets/modelHierarchy.js';

interface ModelPreviewProps {
  asset: Asset;
  nodePath: string | null; // null = 显示整个模型
}

export const ModelPreview: React.FC<ModelPreviewProps> = ({ asset, nodePath }) => {
  const url = `${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
          预览
        </span>
        {nodePath && (
          <span
            className="text-[9px] text-slate-600 truncate max-w-[140px]"
            title={nodePath}
          >
            {nodePath}
          </span>
        )}
      </div>
      <div className="w-full h-[180px] rounded overflow-hidden bg-[#0c0e14] border border-border-dark">
        <Canvas
          frameloop="demand"
          camera={{ fov: 45, near: 0.01, far: 10000 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 4, 2]} intensity={1.2} />
          <directionalLight position={[-2, -1, -2]} intensity={0.3} />
          <Suspense fallback={null}>
            <PreviewScene url={url} nodePath={nodePath} />
          </Suspense>
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            makeDefault
          />
        </Canvas>
      </div>
      <p className="text-[9px] text-slate-600 text-center mt-1">左键旋转 · 滚轮缩放</p>
    </div>
  );
};

// ---- 内部组件（必须在 Canvas 内部使用）----

interface PreviewSceneProps {
  url: string;
  nodePath: string | null;
}

function PreviewScene({ url, nodePath }: PreviewSceneProps) {
  const { scene: gltfScene } = useGLTF(url, true, true, (loader) => {
    loader.setWithCredentials(true);
  });
  const { camera, invalidate } = useThree();
  const controls = useThree((state) => state.controls);

  // 根据 nodePath 决定显示哪个对象：整个模型或指定子节点。
  // 每次都从 gltfScene 原始数据重新克隆，避免 <primitive> 将节点从父树中移除
  // 导致后续 findNodeByPath 失效（Three.js add() 会把节点从原父级摘除）。
  const displayObject = useMemo(() => {
    const source = nodePath
      ? (findNodeByPath(gltfScene, nodePath) ?? gltfScene)
      : gltfScene;
    const cloned = source.clone(true);
    // 独立克隆材质，避免修改 useGLTF 缓存中的共享材质实例
    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m: THREE.Material) => m.clone());
        } else if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });
    return cloned;
  }, [gltfScene, nodePath]);

  // 自动调整相机到包围球，确保模型完整入帧
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(displayObject);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = sphere.radius;
    if (radius === 0) return;

    const perspCamera = camera as THREE.PerspectiveCamera;
    const fovRad = (perspCamera.fov * Math.PI) / 180;
    // 用包围球半径计算安全距离，1.6x 留出呼吸空间
    const dist = (radius / Math.tan(fovRad / 2)) * 1.6;

    // 斜上方 ~33° 视角，具有立体感
    const elevAngle = Math.PI / 5.5;
    const azimAngle = Math.PI / 4;
    camera.position.set(
      center.x + dist * Math.cos(elevAngle) * Math.sin(azimAngle),
      center.y + dist * Math.sin(elevAngle),
      center.z + dist * Math.cos(elevAngle) * Math.cos(azimAngle),
    );

    // 同步 OrbitControls 的旋转轴心到模型中心，否则 lookAt 会被覆盖
    if (controls && 'target' in controls) {
      (controls as any).target.copy(center);
      (controls as any).update();
    } else {
      camera.lookAt(center);
    }

    camera.updateProjectionMatrix();
    invalidate();
  }, [displayObject, camera, controls, invalidate]);

  // displayObject 变化或卸载时释放克隆材质
  useEffect(() => {
    return () => {
      displayObject.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m: THREE.Material) => m?.dispose());
        }
      });
    };
  }, [displayObject]);

  return <primitive object={displayObject} />;
}
