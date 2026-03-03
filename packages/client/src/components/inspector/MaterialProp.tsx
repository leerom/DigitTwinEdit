import React, { useState, useMemo } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useProjectStore } from '@/stores/projectStore';
import { useMaterialStore } from '@/stores/materialStore';
import type { MaterialSpec, MaterialType } from '@/types';
import { ChangeMaterialTypeCommand } from '@/features/editor/commands/ChangeMaterialTypeCommand';
import { UpdateMaterialPropsCommand } from '@/features/editor/commands/UpdateMaterialPropsCommand';
import { BindMaterialAssetCommand } from '@/features/editor/commands/BindMaterialAssetCommand';
import { materialsApi } from '@/api/assets';
import {
  getFieldsForType,
  type FieldGroup,
} from '@/features/materials/materialSchema';
import { MaterialFieldRenderer } from './MaterialFieldRenderer';

const MATERIAL_TYPES: readonly MaterialType[] = [
  'MeshStandardMaterial',
  'MeshPhysicalMaterial',
  'MeshPhongMaterial',
  'MeshLambertMaterial',
  'MeshBasicMaterial',
] as const;

const GROUP_LABELS: Record<FieldGroup, string> = {
  base:      '基础 (Base)',
  pbr:       'PBR',
  physical:  '物理高级 (Physical)',
  maps:      '贴图 (Maps)',
  wireframe: '线框 (Wireframe)',
};

// 默认折叠的分组
const DEFAULT_COLLAPSED: FieldGroup[] = ['physical', 'maps', 'wireframe'];

export const MaterialProp: React.FC<{ objectId: string }> = ({ objectId }) => {
  const material = useSceneStore(
    (state) => state.scene.objects[objectId]?.components?.mesh?.material
  ) as MaterialSpec | undefined;
  const materialAssetId = useSceneStore(
    (state) => (state.scene.objects[objectId]?.components?.mesh as any)?.materialAssetId as number | undefined
  );
  const currentProjectId = useProjectStore((s) => s.currentProject?.id ?? 0);

  const { materials, selectMaterial } = useMaterialStore();
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const boundAsset = materialAssetId
    ? materials.find((m) => m.id === materialAssetId)
    : undefined;

  const type = material?.type ?? 'MeshStandardMaterial';
  const props = (material?.props ?? {}) as Record<string, unknown>;

  // 折叠状态：key = group，value = 是否折叠
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of DEFAULT_COLLAPSED) init[g] = true;
    return init;
  });

  // 按 group 分组字段
  const fieldsByGroup = useMemo(() => {
    const all = getFieldsForType(type as MaterialType);
    const map = new Map<FieldGroup, typeof all>();
    for (const f of all) {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    }
    return map;
  }, [type]);

  const exec = (cmd: any) => useHistoryStore.getState().execute(cmd);

  const handleTypeChange = (nextType: MaterialType) => {
    exec(new ChangeMaterialTypeCommand(objectId, nextType));
  };

  const handlePropChange = (key: string, value: unknown) => {
    exec(new UpdateMaterialPropsCommand(objectId, { [key]: value }));
  };

  const handleBindAsset = async (assetId: number) => {
    setShowAssetPicker(false);
    try {
      const data = await materialsApi.getMaterial(assetId);
      const spec: MaterialSpec = { type: data.type as MaterialType, props: data.properties };
      exec(new BindMaterialAssetCommand(objectId, assetId, spec));
    } catch (error) {
      console.error('Failed to bind material asset:', error);
    }
  };

  const handleUnbind = () => {
    exec(new BindMaterialAssetCommand(objectId, 0, { type: 'MeshStandardMaterial', props: {} }));
  };

  const toggleGroup = (group: FieldGroup) => {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="bg-[#0c0e14] border border-[#2d333f] p-3 rounded-sm space-y-3">
      {/* 类型选择 + 资产绑定 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-[11px] text-[#999999] font-medium">类型</label>
        <div className="flex items-center gap-2 ml-auto">
          {/* 已绑定资产时显示资产名 + 解除按钮 */}
          {boundAsset ? (
            <span className="text-[10px] text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">texture</span>
              <button
                className="hover:underline truncate max-w-[80px]"
                title={boundAsset.name}
                onClick={() => selectMaterial(materialAssetId!)}
              >
                {boundAsset.name}
              </button>
              <button
                onClick={handleUnbind}
                className="hover:text-slate-300 ml-1"
                title="解除绑定"
              >
                ×
              </button>
            </span>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowAssetPicker((v) => !v)}
                className="text-[10px] text-slate-400 hover:text-white border border-[#2d333f] rounded px-2 py-0.5"
              >
                从资产选择
              </button>
              {showAssetPicker && (
                <div className="absolute right-0 top-6 z-50 bg-[#1a1d28] border border-[#2d333f] rounded shadow-xl p-1 min-w-[160px] max-h-48 overflow-y-auto">
                  {materials.length === 0 ? (
                    <p className="text-xs text-slate-500 px-2 py-1">暂无材质资产</p>
                  ) : (
                    materials.map((m) => (
                      <button
                        key={m.id}
                        className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-slate-700 text-xs rounded"
                        onClick={() => handleBindAsset(m.id)}
                      >
                        <span className="material-symbols-outlined text-xs">texture</span>
                        {m.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {/* 类型选择（已绑定时禁用） */}
          <select
            className="bg-[#0c0e14] text-[12px] text-white border border-[#2d333f] rounded px-2 py-1 disabled:opacity-50"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value as MaterialType)}
            disabled={!!materialAssetId}
          >
            {MATERIAL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 已绑定资产只读提示 */}
      {materialAssetId && (
        <p className="text-[10px] text-slate-500 italic">
          材质由资产驱动，请在 Materials 面板中编辑
        </p>
      )}

      {/* Standard / Physical 的 Schema 字段分组 */}
      {(type === 'MeshStandardMaterial' || type === 'MeshPhysicalMaterial') && (
        <>
          {[...fieldsByGroup.entries()].map(([group, fields]) => (
            <div key={group}>
              {/* 分组标题（可折叠） */}
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

              {/* 字段列表 */}
              {!collapsed[group] && (
                <div className="space-y-2 pl-2">
                  {fields.map((field) => (
                    <MaterialFieldRenderer
                      key={field.key}
                      field={field}
                      value={props[field.key] ?? undefined}
                      onChange={handlePropChange}
                      projectId={currentProjectId}
                      disabled={!!materialAssetId}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Phong / Lambert / Basic 仍用旧逻辑（简单字段，不值得 Schema 化） */}
      {(type === 'MeshPhongMaterial' || type === 'MeshLambertMaterial' || type === 'MeshBasicMaterial') && (
        <div className={materialAssetId ? 'pointer-events-none opacity-50' : ''}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] text-[#999999] font-medium">Color</label>
              <input
                type="color"
                value={(typeof props.color === 'string' ? props.color : '#cccccc')}
                onChange={(e) => handlePropChange('color', e.target.value)}
                className="w-8 h-6 bg-transparent border-0 p-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
