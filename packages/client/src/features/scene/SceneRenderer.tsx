import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useEditorStore } from '@/stores/editorStore';
import { useAssetStore } from '@/stores/assetStore';
import { MaterialSpec, ObjectType } from '@/types';
import { ThreeEvent } from '@react-three/fiber';
import { useHelper, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { assetsApi } from '@/api/assets';
import { createThreeMaterial } from '@/features/materials/materialFactory';
import { findNodeByPath } from '@/components/assets/modelHierarchy';

const DEFAULT_BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

// 加载失败时静默降级，防止崩溃整个场景树
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error('[ModelMesh] 模型加载失败:', error); }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// 加载并渲染 GLB/GLTF 模型资产
// 通过 extendLoader 设置 withCredentials，解决跨端口 cookie 鉴权问题
// materialSpec：Inspector 中设置的材质覆盖（颜色、粗糙度等），应用到所有子网格
// assetUpdatedAt：资产的 updated_at 时间戳，作为 URL cache-buster，
//   确保重新导入后 useGLTF 能识别 URL 变化并重新加载新 GLB
const ModelMesh: React.FC<{
  assetId: number;
  assetUpdatedAt: string | undefined;
  materialSpec: MaterialSpec | null;
  renderMode: string;
  activeSubNodePath: string | null;
  nodeOverrides: Record<string, any> | null;
}> = React.memo(({ assetId, assetUpdatedAt, materialSpec, renderMode, activeSubNodePath, nodeOverrides }) => {
  const baseUrl = assetsApi.getAssetDownloadUrl(assetId);
  // 将 updated_at 时间戳附加到 URL 作为版本标记；
  // useGLTF 按 URL 缓存，URL 变化即触发重新加载，消除重新导入后的缓存问题
  const url = assetUpdatedAt
    ? `${baseUrl}?v=${new Date(assetUpdatedAt).getTime()}`
    : baseUrl;
  const { scene: gltfScene } = useGLTF(url, true, true, (loader) => {
    loader.setWithCredentials(true);
  });

  // 克隆场景，同时克隆每个网格的材质以免修改共享实例
  // 并应用 nodeOverrides 中的 transform/material 覆盖
  const clonedScene = useMemo(() => {
    const clone = gltfScene.clone(true);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map((m: THREE.Material) => m.clone());
        } else if (mesh.material) {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
      }
    });

    // 应用 nodeOverrides
    if (nodeOverrides) {
      for (const [path, override] of Object.entries(nodeOverrides)) {
        const node = findNodeByPath(clone, path);
        if (!node) continue;
        if (override.transform?.position) node.position.fromArray(override.transform.position);
        if (override.transform?.rotation)
          node.rotation.fromArray([...override.transform.rotation, 'XYZ'] as [number, number, number, THREE.EulerOrder]);
        if (override.transform?.scale) node.scale.fromArray(override.transform.scale);
        if (override.material) {
          node.traverse((child) => {
            const m = child as THREE.Mesh;
            if (m.isMesh) {
              m.material = createThreeMaterial(override.material);
            }
          });
        }
      }
    }

    // 确保世界矩阵在应用 overrides 后更新，保证包围盒计算正确
    clone.updateWorldMatrix(true, true);

    return clone;
  }, [gltfScene, nodeOverrides]);

  // 当 materialSpec 变化时，将属性应用到所有子网格的材质
  // 即使 materialSpec 为 null，也应用 roughness/metalness 默认值（0），
  // 保证 Inspector 显示值与实际渲染一致；颜色不覆盖（保留 GLTF 原始纹理）
  useEffect(() => {
    const props = (materialSpec?.props ?? {}) as Record<string, unknown>;

    clonedScene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!mat) return;
        const m = mat as any;
        for (const [key, value] of Object.entries(props)) {
          if (key === 'color' && typeof value === 'string' && m.color?.set) {
            m.color.set(value);
          } else if (key !== 'color' && typeof value === 'number' && key in m) {
            m[key] = value;
          }
        }
        // 应用 Inspector 显示的默认值（未被 materialSpec 明确覆盖的属性）
        if (!('roughness' in props) && 'roughness' in m) m.roughness = 0;
        if (!('metalness' in props) && 'metalness' in m) m.metalness = 0;
        m.needsUpdate = true;
      });
    });
  }, [clonedScene, materialSpec]);

  // 当 renderMode 变化时，将 wireframe 应用到所有子网格材质
  useEffect(() => {
    clonedScene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!mat) return;
        (mat as any).wireframe = renderMode === 'wireframe';
        mat.needsUpdate = true;
      });
    });
  }, [clonedScene, renderMode]);

  // 卸载时释放克隆的材质
  useEffect(() => {
    return () => {
      clonedScene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m: THREE.Material) => m?.dispose());
        }
      });
    };
  }, [clonedScene]);

  // 计算当前选中子节点的包围盒，用于高亮显示
  const highlightData = useMemo(() => {
    if (!activeSubNodePath) return null;
    const node = findNodeByPath(clonedScene, activeSubNodePath);
    if (!node) return null;
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) return null;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    return { center, size };
  }, [clonedScene, activeSubNodePath]);

  return (
    <>
      <primitive object={clonedScene} />
      {highlightData && (
        <mesh position={highlightData.center.toArray()}>
          <boxGeometry args={[highlightData.size.x, highlightData.size.y, highlightData.size.z]} />
          <meshBasicMaterial wireframe color="#3b82f6" transparent opacity={0.8} />
        </mesh>
      )}
    </>
  );
});

export const resolveWireframeOverride = (renderMode: string, materialSpec: MaterialSpec | null) => {
  if (renderMode === 'wireframe') return true;
  return materialSpec?.props?.wireframe ?? false;
};

const ObjectRenderer: React.FC<{ id: string }> = React.memo(({ id }) => {
  const object = useSceneStore((state) => state.scene.objects[id]);

  const selectedIds = useEditorStore((state) => state.selectedIds);
  const activeId = useEditorStore((state) => state.activeId);
  const select = useEditorStore((state) => state.select);
  const renderMode = useEditorStore((state) => state.renderMode);
  const activeTool = useEditorStore((state) => state.activeTool);
  const activeSubNodePath = useEditorStore((state) => state.activeSubNodePath);
  const assets = useAssetStore((state) => state.assets);

  // Hooks 必须每次渲染保持一致调用次数，这里不能在 hooks 之间提前 return
  const isSelected = selectedIds.includes(id);
  // const isActive = activeId === id;

  const lightRef = useRef<THREE.DirectionalLight>(null!);
  const cameraRef = useRef<THREE.Camera>(null!);
  const groupRef = useRef<THREE.Group>(null!);

  // Safe access to object properties for hooks
  useHelper(isSelected && object?.type === ObjectType.LIGHT ? lightRef : null, THREE.DirectionalLightHelper, 1, 'yellow');
  useHelper(isSelected && object?.type === ObjectType.CAMERA ? cameraRef : null, THREE.CameraHelper);
  // 抓手工具模式下，为选中的 MESH 对象显示金色包围盒描边
  useHelper(isSelected && activeTool === 'hand' && object?.type === ObjectType.MESH ? groupRef : null, THREE.BoxHelper, '#FFD700');

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (e.delta > 2) return;

    // Force single selection
    // const isMultiSelect = e.ctrlKey || e.metaKey;
    select([id], false);
  };

  const showEdges = renderMode === 'hybrid';

  const geometry = useMemo(() => {
    if (!object || object?.type !== ObjectType.MESH) return null;
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

  const { position, rotation, scale } = object?.transform || { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] };

  const children = object?.children?.map((childId) => (
    <ObjectRenderer key={childId} id={childId} />
  )) || [];

  const materialSpec = useMemo<MaterialSpec | null>(() => {
    if (object?.type !== ObjectType.MESH) return null;
    return object.components?.mesh?.material ?? null;
  }, [object?.type, object?.components?.mesh?.material]);

  // 解析模型的 assetId：优先使用 components.model.assetId，
  // 兜底按 file_path 在资产列表中查找（兼容旧版场景仅存 path 而无 assetId 的情况）
  const resolvedAssetId = useMemo<number | null>(() => {
    const modelComp = object?.components?.model;
    if (!modelComp) return null;
    if (modelComp.assetId) return modelComp.assetId;
    if (modelComp.path) {
      const normalizedPath = (modelComp.path as string).replace(/\\/g, '/');
      const found = assets.find((a) => {
        const assetFilePath = a.file_path.replace(/\\/g, '/');
        return assetFilePath === normalizedPath || assetFilePath.endsWith('/' + normalizedPath) || normalizedPath.endsWith('/' + assetFilePath);
      });
      return found?.id ?? null;
    }
    return null;
  }, [object?.components?.model, assets]);

  // 获取资产的 updated_at 时间戳，作为 ModelMesh URL 的 cache-buster；
  // 重新导入后 updated_at 变化，确保 useGLTF 重新加载新 GLB 而非使用缓存
  const assetUpdatedAt = useMemo<string | undefined>(() => {
    if (resolvedAssetId === null) return undefined;
    return assets.find((a) => a.id === resolvedAssetId)?.updated_at;
  }, [resolvedAssetId, assets]);

  // 子节点属性覆盖（存储在 components.model.nodeOverrides）
  const nodeOverrides = useMemo<Record<string, any> | null>(() => {
    return (object?.components?.model as any)?.nodeOverrides ?? null;
  }, [object?.components?.model]);

  const materialRef = useRef<THREE.Material | null>(null);
  const lastTypeRef = useRef<MaterialSpec['type'] | null>(null);

  // 当组件卸载时 dispose；当材质类型切换时重建并 dispose 旧材质
  useEffect(() => {
    return () => {
      materialRef.current?.dispose();
      materialRef.current = null;
      lastTypeRef.current = null;
    };
  }, []);

  // 注意：材质 props（如 color/roughness/metalness）变化时也要实时联动到 SceneView。
  // 这里用「类型变化就重建」+「props 变化就同步到现有实例」的组合策略：
  // - type 变：dispose 旧实例，new 新实例
  // - props 变：把 props 逐项 apply 到当前 material，并标记 needsUpdate
  if (materialSpec && lastTypeRef.current !== materialSpec.type) {
    materialRef.current?.dispose();
    materialRef.current = createThreeMaterial(materialSpec);
    lastTypeRef.current = materialSpec.type;
  }

  useEffect(() => {
    if (!materialSpec || !materialRef.current) return;

    const mat: any = materialRef.current;
    const props = (materialSpec.props ?? {}) as Record<string, unknown>;

    for (const [key, value] of Object.entries(props)) {
      if (key === 'color' && typeof value === 'string' && mat.color?.set) {
        mat.color.set(value);
        continue;
      }

      if (key === 'specular' && typeof value === 'string' && mat.specular?.set) {
        mat.specular.set(value);
        continue;
      }

      mat[key] = value as any;
    }

    mat.wireframe = resolveWireframeOverride(renderMode, materialSpec);
    mat.needsUpdate = true;
  }, [materialSpec, renderMode, selectedIds]);

  // 对象被删除的瞬间仍可能触发一次渲染；这里用空 group 兜底，避免访问 undefined 导致 Canvas 树崩溃
  if (!object) {
    return <group name={id} />;
  }

  return (
    <group
      ref={groupRef}
      name={id} // Add name prop to allow finding object by ID
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={handleClick}
    >
      {/* 基础几何体网格：模型对象（有 model 组件）不渲染 Box 占位，避免叠加 */}
      {object?.type === ObjectType.MESH && !object.components?.model && geometry && materialRef.current && (
        <mesh castShadow receiveShadow geometry={geometry} material={materialRef.current}>
           {showEdges && (
              <lineSegments>
                <edgesGeometry args={[geometry]} />
                <lineBasicMaterial color="black" />
              </lineSegments>
           )}
        </mesh>
      )}

      {object?.type === ObjectType.MESH && resolvedAssetId !== null && (
        <ModelErrorBoundary>
          <Suspense fallback={null}>
            <ModelMesh
              assetId={resolvedAssetId}
              assetUpdatedAt={assetUpdatedAt}
              materialSpec={materialSpec}
              renderMode={renderMode}
              activeSubNodePath={activeId === id ? activeSubNodePath : null}
              nodeOverrides={nodeOverrides}
            />
          </Suspense>
        </ModelErrorBoundary>
      )}

      {object?.type === ObjectType.CAMERA && (
        <group>
           <perspectiveCamera
             ref={cameraRef}
             fov={object.components?.camera?.fov ?? 50}
             near={object.components?.camera?.near ?? 0.1}
             far={object.components?.camera?.far ?? 1000}
           />
           <mesh>
             <boxGeometry args={[0.5, 0.5, 0.5]} />
             <meshBasicMaterial color="#8800ff" />
           </mesh>
           <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
             <coneGeometry args={[0.2, 0.5, 16]} />
             <meshBasicMaterial color="#8800ff" />
           </mesh>
        </group>
      )}

      {object?.type === ObjectType.LIGHT && (
        <group>
          <directionalLight
            ref={lightRef}
            color={object.components?.light?.color ?? '#ffffff'}
            intensity={object.components?.light?.intensity ?? 1}
          />
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#ffff00" />
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

      {object?.type === ObjectType.GROUP && (
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
