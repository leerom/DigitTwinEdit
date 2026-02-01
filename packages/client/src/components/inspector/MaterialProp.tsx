import React, { useMemo } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useHistoryStore } from '@/stores/historyStore';
import type { MaterialSpec, MaterialType } from '@/types';
import { ChangeMaterialTypeCommand } from '@/features/editor/commands/ChangeMaterialTypeCommand';
import { UpdateMaterialPropsCommand } from '@/features/editor/commands/UpdateMaterialPropsCommand';
import { NumberInput } from './common/NumberInput';

const MATERIAL_TYPES: readonly MaterialType[] = [
  'MeshStandardMaterial',
  'MeshPhysicalMaterial',
  'MeshPhongMaterial',
  'MeshLambertMaterial',
  'MeshBasicMaterial',
] as const;

function getMaterialPropNumber(props: Record<string, unknown>, key: string, fallback: number): number {
  const v = props[key];
  return typeof v === 'number' ? v : fallback;
}

export const MaterialProp: React.FC<{ objectId: string }> = ({ objectId }) => {
  const material = useSceneStore((state) => state.scene.objects[objectId]?.components?.mesh?.material) as MaterialSpec | undefined;

  const type = material?.type ?? 'MeshStandardMaterial';
  const props = (material?.props ?? {}) as Record<string, unknown>;

  const fields = useMemo(() => {
    switch (type) {
      case 'MeshPhysicalMaterial':
        return ['roughness', 'metalness', 'clearcoat', 'clearcoatRoughness', 'ior', 'transmission', 'thickness'] as const;
      case 'MeshPhongMaterial':
        return ['shininess'] as const;
      case 'MeshStandardMaterial':
        return ['roughness', 'metalness'] as const;
      case 'MeshLambertMaterial':
      case 'MeshBasicMaterial':
      default:
        return [] as const;
    }
  }, [type]);

  const exec = (cmd: any) => useHistoryStore.getState().execute(cmd);

  const handleTypeChange = (nextType: MaterialType) => {
    exec(new ChangeMaterialTypeCommand(objectId, nextType));
  };

  const handlePropChange = (key: string, value: number) => {
    exec(new UpdateMaterialPropsCommand(objectId, { [key]: value }));
  };

  return (
    <div className="bg-[#0c0e14] border border-[#2d333f] p-3 rounded-sm space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-[#999999] font-medium">类型</label>
        <select
          className="bg-[#0c0e14] text-[12px] text-white border border-[#2d333f] rounded px-2 py-1"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value as MaterialType)}
        >
          {MATERIAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-[11px] text-[#999999] font-medium">Color</label>
        <input
          type="color"
          value={(typeof props.color === 'string' ? props.color : '#cccccc') as string}
          onChange={(e) => exec(new UpdateMaterialPropsCommand(objectId, { color: e.target.value }))}
          className="w-8 h-6 bg-transparent border-0 p-0 cursor-pointer"
        />
      </div>

      {fields.map((key) => {
        const value = getMaterialPropNumber(props, key, 0);

        // 基于 three.js 文档/示例设定合理的 UI 取值范围
        const range = (() => {
          switch (key) {
            case 'roughness':
            case 'metalness':
            case 'clearcoat':
            case 'clearcoatRoughness':
            case 'transmission':
              return { min: 0, max: 1, step: '0.01' };
            case 'ior':
              return { min: 1, max: 2.333, step: '0.001' };
            case 'thickness':
              return { min: 0, max: undefined, step: '0.01' };
            case 'shininess':
              // 你指定：0~1
              return { min: 0, max: 1, step: '0.01' };
            default:
              return { min: undefined, max: undefined, step: '0.01' };
          }
        })();

        return (
          <NumberInput
            key={key}
            label={key}
            value={value}
            onChange={(val) => handlePropChange(key, val)}
            step={range.step}
            min={range.min}
            max={range.max}
          />
        );
      })}
    </div>
  );
};
