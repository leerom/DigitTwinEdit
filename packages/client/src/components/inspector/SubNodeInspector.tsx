import React, { useEffect, useState, useCallback } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { useEditorStore } from '../../stores/editorStore.js';
import { useSceneStore } from '../../stores/sceneStore.js';
import { useAssetStore } from '../../stores/assetStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { assetsApi } from '../../api/assets.js';
import { findNodeByPath } from '../assets/modelHierarchy.js';
import { getFieldsForType } from '../../features/materials/materialSchema.js';
import type { MaterialType } from '../../types/index.js';
import { MaterialFieldRenderer } from './MaterialFieldRenderer.js';

// 与 TransformProp 中相同的 AxisInput/Vector3Input 样式组件（局部副本）
const AxisInput = ({
  label,
  value,
  onChange,
  colorLabel,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  colorLabel: string;
}) => {
  const [local, setLocal] = useState(String(Math.round(value * 1000) / 1000));

  useEffect(() => {
    setLocal(String(Math.round(value * 1000) / 1000));
  }, [value]);

  const commit = () => {
    const n = parseFloat(local);
    if (!isNaN(n)) onChange(n);
    else setLocal(String(Math.round(value * 1000) / 1000));
  };

  return (
    <div className="relative flex-1 min-w-0">
      <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold select-none ${colorLabel}`}>
        {label}
      </span>
      <input
        type="text"
        className="w-full pl-5 pr-1 py-1 bg-[#0c0e14] border-none rounded-sm text-[10px] font-mono text-[#cccccc] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/50"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.currentTarget.blur(); commit(); }
        }}
      />
    </div>
  );
};

const Vector3Row = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
}) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] text-[#999999] font-medium mb-1">{label}</span>
    <div className="flex gap-2">
      <AxisInput label="X" value={value[0]} onChange={(v) => onChange([v, value[1], value[2]])} colorLabel="text-[#ff4d4d]" />
      <AxisInput label="Y" value={value[1]} onChange={(v) => onChange([value[0], v, value[2]])} colorLabel="text-[#4dff4d]" />
      <AxisInput label="Z" value={value[2]} onChange={(v) => onChange([value[0], value[1], v])} colorLabel="text-[#4d79ff]" />
    </div>
  </div>
);

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

interface NodeInfo {
  position: [number, number, number];
  rotation: [number, number, number]; // degrees
  scale: [number, number, number];
  materialName: string;
  materialType: string;
  materialProps: Record<string, unknown>;
}

export const SubNodeInspector: React.FC = () => {
  const activeId = useEditorStore((s) => s.activeId);
  const activeSubNodePath = useEditorStore((s) => s.activeSubNodePath);
  const objects = useSceneStore((s) => s.scene.objects);
  const updateComponent = useSceneStore((s) => s.updateComponent);
  const assets = useAssetStore((s) => s.assets);
  const currentProjectId = useProjectStore((s) => s.currentProject?.id ?? 0);

  const object = activeId ? objects[activeId] : null;
  const modelComp = (object?.components as any)?.model;
  const assetId: number | null = modelComp?.assetId ?? null;
  const asset = assetId !== null ? assets.find((a) => a.id === assetId) : undefined;
  // 响应式读取 nodeOverrides，供 Gizmo 拖拽实时同步使用
  const nodeOverrides = modelComp?.nodeOverrides ?? null;

  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);

  // 从 GLTF 加载节点的初始 transform 和材质信息
  useEffect(() => {
    if (!asset || !activeSubNodePath) {
      setNodeInfo(null);
      return;
    }

    const url = `${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`;
    const loader = new GLTFLoader();
    loader.setWithCredentials(true);

    let cancelled = false;
    loader.load(
      url,
      (gltf) => {
        if (cancelled) return;
        const node = findNodeByPath(gltf.scene, activeSubNodePath);
        if (!node) {
          setNodeInfo(null);
          return;
        }

        // 先用 GLTF 原始值作为基础
        const pos: [number, number, number] = [node.position.x, node.position.y, node.position.z];
        const rot: [number, number, number] = [
          node.rotation.x * RAD_TO_DEG,
          node.rotation.y * RAD_TO_DEG,
          node.rotation.z * RAD_TO_DEG,
        ];
        const sc: [number, number, number] = [node.scale.x, node.scale.y, node.scale.z];

        // 提取材质信息，从 GLTF 材质读取基础 props
        let materialName = '—';
        let materialType = 'MeshStandardMaterial';
        const baseMaterialProps: Record<string, unknown> = {};

        const meshNode = node as THREE.Mesh;
        if (meshNode.isMesh && meshNode.material) {
          const mat = Array.isArray(meshNode.material) ? meshNode.material[0] : meshNode.material;
          if (mat) {
            materialName = (mat as any).name || '(unnamed)';
            materialType = mat.type;
            const stdMat = mat as THREE.MeshStandardMaterial;
            if (stdMat.color) baseMaterialProps.color = '#' + stdMat.color.getHexString();
            if (typeof stdMat.roughness === 'number') baseMaterialProps.roughness = stdMat.roughness;
            if (typeof stdMat.metalness === 'number') baseMaterialProps.metalness = stdMat.metalness;
            if (typeof stdMat.emissiveIntensity === 'number') baseMaterialProps.emissiveIntensity = stdMat.emissiveIntensity;
            if (stdMat.emissive) baseMaterialProps.emissive = '#' + stdMat.emissive.getHexString();
          }
        }

        // 叠加 nodeOverrides（如果存在）
        const overrides = modelComp?.nodeOverrides?.[activeSubNodePath];
        if (overrides?.transform) {
          if (overrides.transform.position) {
            pos[0] = overrides.transform.position[0];
            pos[1] = overrides.transform.position[1];
            pos[2] = overrides.transform.position[2];
          }
          if (overrides.transform.rotation) {
            rot[0] = overrides.transform.rotation[0] * RAD_TO_DEG;
            rot[1] = overrides.transform.rotation[1] * RAD_TO_DEG;
            rot[2] = overrides.transform.rotation[2] * RAD_TO_DEG;
          }
          if (overrides.transform.scale) {
            sc[0] = overrides.transform.scale[0];
            sc[1] = overrides.transform.scale[1];
            sc[2] = overrides.transform.scale[2];
          }
        }

        // 叠加材质覆盖（overrides 优先级更高）
        const overrideProps = overrides?.material?.props ?? {};
        const mergedProps = { ...baseMaterialProps, ...overrideProps };

        setNodeInfo({
          position: pos, rotation: rot, scale: sc,
          materialName, materialType,
          materialProps: mergedProps,
        });
      },
      undefined,
      (err) => {
        if (!cancelled) console.error('[SubNodeInspector] 加载失败:', err);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [assetId, asset?.updated_at, activeSubNodePath]);

  // 监听 nodeOverrides 变化（来自 Gizmo 拖拽），实时同步 transform 显示值
  // 与 GLTF 加载 effect 分离，避免拖拽时重新加载 GLTF
  useEffect(() => {
    if (!activeSubNodePath) return;
    const override = nodeOverrides?.[activeSubNodePath];
    if (!override?.transform) return;

    setNodeInfo((prev) => {
      if (!prev) return prev;
      const t = override.transform;
      return {
        ...prev,
        ...(t.position && { position: t.position as [number, number, number] }),
        ...(t.rotation && {
          rotation: [
            t.rotation[0] * RAD_TO_DEG,
            t.rotation[1] * RAD_TO_DEG,
            t.rotation[2] * RAD_TO_DEG,
          ] as [number, number, number],
        }),
        ...(t.scale && { scale: t.scale as [number, number, number] }),
      };
    });
  }, [nodeOverrides, activeSubNodePath]);

  const handleTransformChange = useCallback(
    (type: 'position' | 'rotation' | 'scale', value: [number, number, number]) => {
      if (!activeId || !activeSubNodePath) return;

      const radValue: [number, number, number] =
        type === 'rotation'
          ? [value[0] * DEG_TO_RAD, value[1] * DEG_TO_RAD, value[2] * DEG_TO_RAD]
          : value;

      const existing = (objects[activeId]?.components as any)?.model ?? {};
      const existingOverrides = existing.nodeOverrides ?? {};

      updateComponent(activeId, 'model', {
        ...existing,
        nodeOverrides: {
          ...existingOverrides,
          [activeSubNodePath]: {
            ...(existingOverrides[activeSubNodePath] ?? {}),
            transform: {
              ...(existingOverrides[activeSubNodePath]?.transform ?? {}),
              [type]: radValue,
            },
          },
        },
      });

      // 同步更新本地显示状态
      setNodeInfo((prev) =>
        prev ? { ...prev, [type]: value } : prev
      );
    },
    [activeId, activeSubNodePath, objects, updateComponent]
  );

  const handleMaterialChange = useCallback(
    (prop: string, value: unknown) => {
      if (!activeId || !activeSubNodePath) return;

      const existing = (objects[activeId]?.components as any)?.model ?? {};
      const existingOverrides = existing.nodeOverrides ?? {};
      const existingNodeOverride = existingOverrides[activeSubNodePath] ?? {};
      const existingMatOverride = existingNodeOverride.material ?? {};
      const existingProps = existingMatOverride.props ?? {};
      const matType = existingMatOverride.type ?? 'MeshStandardMaterial';

      updateComponent(activeId, 'model', {
        ...existing,
        nodeOverrides: {
          ...existingOverrides,
          [activeSubNodePath]: {
            ...existingNodeOverride,
            material: {
              type: matType,
              props: { ...existingProps, [prop]: value },
            },
          },
        },
      });

      // 同步本地显示状态
      setNodeInfo((prev) => {
        if (!prev) return prev;
        return { ...prev, materialProps: { ...prev.materialProps, [prop]: value } };
      });
    },
    [activeId, activeSubNodePath, objects, updateComponent]
  );

  if (!nodeInfo || !activeSubNodePath) return null;

  // 从路径末段提取节点名
  const nodeName = activeSubNodePath.split('/').pop() ?? activeSubNodePath;

  const matType = nodeInfo.materialType as MaterialType;
  const fields = (matType === 'MeshStandardMaterial' || matType === 'MeshPhysicalMaterial')
    ? getFieldsForType(matType)
    : getFieldsForType('MeshStandardMaterial');

  return (
    <div className="flex flex-col gap-4">
      {/* 子节点标题 */}
      <div className="flex items-center gap-2 p-3 bg-primary/5 rounded border border-primary/20">
        <span className="material-symbols-outlined text-xs text-primary">deployed_code</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white font-medium truncate">{nodeName}</p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5" title={activeSubNodePath}>
            {activeSubNodePath}
          </p>
        </div>
      </div>

      {/* Transform */}
      <div>
        <h3 className="text-[11px] font-bold text-slate-300 mb-3">子节点变换 (Transform)</h3>
        <div className="space-y-3">
          <Vector3Row
            label="位置 P"
            value={nodeInfo.position}
            onChange={(v) => handleTransformChange('position', v)}
          />
          <Vector3Row
            label="旋转 R"
            value={nodeInfo.rotation}
            onChange={(v) => handleTransformChange('rotation', v)}
          />
          <Vector3Row
            label="缩放 S"
            value={nodeInfo.scale}
            onChange={(v) => handleTransformChange('scale', v)}
          />
        </div>
      </div>

      {/* 材质 */}
      <div>
        <h3 className="text-[11px] font-bold text-slate-300 mb-2">材质 (Material)</h3>
        <div className="space-y-1 text-[10px] text-slate-500 mb-2">
          <span>类型：{nodeInfo.materialType}</span>
          {nodeInfo.materialName !== '—' && (
            <span className="block">名称：{nodeInfo.materialName}</span>
          )}
        </div>
        <div className="space-y-2">
          {fields.map((field) => (
            <MaterialFieldRenderer
              key={field.key}
              field={field}
              value={nodeInfo.materialProps[field.key]}
              onChange={handleMaterialChange}
              projectId={currentProjectId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
