import React, { useState, useMemo } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useProjectStore } from '@/stores/projectStore';
import type { MaterialSpec, MaterialType } from '@/types';
import { ChangeMaterialTypeCommand } from '@/features/editor/commands/ChangeMaterialTypeCommand';
import { UpdateMaterialPropsCommand } from '@/features/editor/commands/UpdateMaterialPropsCommand';
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
  const currentProjectId = useProjectStore((s) => s.currentScene?.project_id ?? 0);

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

  const toggleGroup = (group: FieldGroup) => {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div className="bg-[#0c0e14] border border-[#2d333f] p-3 rounded-sm space-y-3">
      {/* 类型选择 */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-[#999999] font-medium">类型</label>
        <select
          className="bg-[#0c0e14] text-[12px] text-white border border-[#2d333f] rounded px-2 py-1"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as MaterialType)}
        >
          {MATERIAL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

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
      )}
    </div>
  );
};
