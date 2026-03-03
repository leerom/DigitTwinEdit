import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMaterialStore } from '@/stores/materialStore';
import { useSceneStore } from '@/stores/sceneStore';
import { materialsApi } from '@/api/assets';
import type { MaterialSpec, MaterialType } from '@/types';
import { getFieldsForType, type FieldGroup } from '@/features/materials/materialSchema';
import { MaterialFieldRenderer } from './MaterialFieldRenderer';

const MATERIAL_TYPES: readonly MaterialType[] = [
  'MeshStandardMaterial',
  'MeshPhysicalMaterial',
  'MeshPhongMaterial',
  'MeshLambertMaterial',
  'MeshBasicMaterial',
] as const;

const GROUP_LABELS: Record<FieldGroup, string> = {
  base: '基础 (Base)',
  pbr: 'PBR',
  physical: '物理高级 (Physical)',
  maps: '贴图 (Maps)',
  wireframe: '线框 (Wireframe)',
};

const DEFAULT_COLLAPSED: FieldGroup[] = ['physical', 'maps', 'wireframe'];
const DEBOUNCE_MS = 500;

interface Props {
  assetId: number;
  projectId: number;
}

export const MaterialAssetProp: React.FC<Props> = ({ assetId, projectId }) => {
  const saveError = useMaterialStore((s) => s.saveError);
  const clearSaveError = useMaterialStore((s) => s.clearSaveError);
  const updateMaterialSpec = useMaterialStore((s) => s.updateMaterialSpec);
  const syncMaterialAsset = useSceneStore((s) => s.syncMaterialAsset);

  const [localSpec, setLocalSpec] = useState<MaterialSpec>({
    type: 'MeshStandardMaterial',
    props: {},
  });
  const [isLoadingSpec, setIsLoadingSpec] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of DEFAULT_COLLAPSED) init[g] = true;
    return init;
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载材质数据
  useEffect(() => {
    setIsLoadingSpec(true);
    materialsApi.getMaterial(assetId).then((data) => {
      setLocalSpec({ type: data.type as MaterialType, props: data.properties });
      setIsLoadingSpec(false);
    }).catch(() => setIsLoadingSpec(false));
  }, [assetId]);

  const fieldsByGroup = useMemo(() => {
    const all = getFieldsForType(localSpec.type as MaterialType);
    const map = new Map<FieldGroup, typeof all>();
    for (const f of all) {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    }
    return map;
  }, [localSpec.type]);

  const scheduleUpdate = useCallback((spec: MaterialSpec) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      updateMaterialSpec(assetId, spec);
    }, DEBOUNCE_MS);
  }, [assetId, updateMaterialSpec]);

  const handleTypeChange = (nextType: MaterialType) => {
    const newSpec = { type: nextType, props: localSpec.props };
    setLocalSpec(newSpec);
    syncMaterialAsset(assetId, newSpec);  // 立即同步到 Scene View
    scheduleUpdate(newSpec);
  };

  const handlePropChange = (key: string, value: unknown) => {
    const newSpec = { ...localSpec, props: { ...localSpec.props, [key]: value } };
    setLocalSpec(newSpec);
    syncMaterialAsset(assetId, newSpec);  // 立即同步到 Scene View
    scheduleUpdate(newSpec);
  };

  const toggleGroup = (group: FieldGroup) =>
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));

  if (isLoadingSpec) {
    return <div className="text-xs text-slate-500 p-3">加载中...</div>;
  }

  const showBasicColorOnly =
    localSpec.type === 'MeshPhongMaterial' ||
    localSpec.type === 'MeshLambertMaterial' ||
    localSpec.type === 'MeshBasicMaterial';

  return (
    <div className="bg-[#0c0e14] border border-[#2d333f] p-3 rounded-sm space-y-3">
      {/* 保存错误横幅 */}
      {saveError && (
        <div className="flex items-center gap-1 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
          <span className="material-symbols-outlined text-sm">error</span>
          <span className="flex-1">{saveError}</span>
          <button onClick={clearSaveError} className="hover:text-red-200">×</button>
        </div>
      )}

      {/* 类型选择 */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-[#999999] font-medium">类型</label>
        <select
          className="bg-[#0c0e14] text-[12px] text-white border border-[#2d333f] rounded px-2 py-1"
          value={localSpec.type}
          onChange={(e) => handleTypeChange(e.target.value as MaterialType)}
        >
          {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Standard / Physical 分组字段 */}
      {!showBasicColorOnly && (
        <>
          {[...fieldsByGroup.entries()].map(([group, fields]) => (
            <div key={group}>
              <button
                className="flex items-center w-full text-left gap-1 mb-1.5"
                onClick={() => toggleGroup(group)}
              >
                <span className="text-[9px] text-slate-500">
                  {collapsed[group] ? '▶' : '▼'}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {GROUP_LABELS[group] ?? group}
                </span>
              </button>
              {!collapsed[group] && (
                <div className="space-y-2 pl-2">
                  {fields.map((field) => (
                    <MaterialFieldRenderer
                      key={field.key}
                      field={field}
                      value={localSpec.props[field.key] ?? undefined}
                      onChange={handlePropChange}
                      projectId={projectId}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Phong / Lambert / Basic 简单颜色 */}
      {showBasicColorOnly && (
        <div className="flex items-center justify-between">
          <label className="text-[11px] text-[#999999] font-medium">颜色</label>
          <input
            type="color"
            value={typeof localSpec.props.color === 'string' ? localSpec.props.color : '#cccccc'}
            onChange={(e) => handlePropChange('color', e.target.value)}
            className="w-8 h-6 bg-transparent border-0 p-0 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
};
