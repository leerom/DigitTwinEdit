import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType, MeshComponent, SceneObject } from '@/types';
import { getCommonValue, MIXED_VALUE } from '../utils/inspectorUtils';
import { NumberInput } from '../common/NumberInput';
import { Checkbox } from '../common/Checkbox';

interface MeshPropProps {
  objectIds: string[];
}

export const MeshProp: React.FC<MeshPropProps> = ({ objectIds }) => {
  const objects = useSceneStore((state) => state.scene.objects);
  const updateComponent = useSceneStore((state) => state.updateComponent);
  const updateObject = useSceneStore((state) => state.updateObject);

  // 过滤有效的 MESH 和 GROUP 对象
  const selectedObjects = objectIds
    .map((id) => objects[id])
    .filter((obj) => obj && (obj.type === ObjectType.MESH || obj.type === ObjectType.GROUP));

  if (selectedObjects.length === 0) return null;

  const isMesh = (obj: SceneObject) => obj.type === ObjectType.MESH;

  // 从 MESH 的 MeshComponent 或 GROUP 的 SceneObject 顶层读取值
  const getObjectPropValue = (key: keyof SceneObject) => {
    const values = selectedObjects.map((obj) => obj[key]);
    const first = values[0];
    const isConsistent = values.every((v) => v === first);
    return isConsistent ? first : MIXED_VALUE;
  };

  const getMeshCompValue = (key: keyof MeshComponent) => {
    const values = selectedObjects.map((obj) => {
      if (isMesh(obj)) return obj.components?.mesh?.[key];
      // GROUP 读取 SceneObject 顶层同名字段
      return (obj as any)[key];
    });
    const definedValues = values.filter((v): v is NonNullable<typeof v> => v !== undefined);
    if (definedValues.length === 0) return undefined;
    if (definedValues.length !== selectedObjects.length) return MIXED_VALUE;
    return getCommonValue(definedValues);
  };

  const castShadow = getMeshCompValue('castShadow');
  const receiveShadow = getMeshCompValue('receiveShadow');
  const frustumCulled = getMeshCompValue('frustumCulled');
  const renderOrder = getMeshCompValue('renderOrder');
  const visible = getObjectPropValue('visible');

  // 更新：MESH 用 updateComponent，GROUP 用 updateObject
  const handleRenderPropUpdate = (key: string, value: unknown) => {
    selectedObjects.forEach((obj) => {
      if (isMesh(obj)) {
        updateComponent(obj.id, 'mesh', { [key]: value });
      } else {
        updateObject(obj.id, { [key]: value });
      }
    });
  };

  const handleVisibleUpdate = (val: boolean) => {
    selectedObjects.forEach((obj) => {
      updateObject(obj.id, { visible: val });
    });
  };

  return (
    <div className="flex flex-col gap-4 pl-0">
      <h3 className="text-[11px] font-bold text-slate-300">对象属性 (Object)</h3>

      {/* 阴影 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#999999] font-medium min-w-[60px]">阴影</span>
        <div className="flex space-x-4 w-full">
          <Checkbox
            label="产生"
            checked={castShadow === undefined ? true : castShadow as boolean | typeof MIXED_VALUE}
            onChange={(val) => handleRenderPropUpdate('castShadow', val)}
          />
          <Checkbox
            label="接收"
            checked={receiveShadow === undefined ? true : receiveShadow as boolean | typeof MIXED_VALUE}
            onChange={(val) => handleRenderPropUpdate('receiveShadow', val)}
          />
        </div>
      </div>

      {/* 可见性 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#999999] font-medium min-w-[60px]">可见性</span>
        <div className="w-full flex justify-start">
          <Checkbox
            checked={visible as boolean | typeof MIXED_VALUE}
            onChange={handleVisibleUpdate}
          />
        </div>
      </div>

      {/* 视锥体裁剪 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#999999] font-medium min-w-[60px]">视锥体裁剪</span>
        <div className="w-full flex justify-start">
          <Checkbox
            checked={frustumCulled === undefined ? true : frustumCulled as boolean | typeof MIXED_VALUE}
            onChange={(val) => handleRenderPropUpdate('frustumCulled', val)}
          />
        </div>
      </div>

      {/* 渲染顺序 */}
      <NumberInput
        label="渲染次序"
        value={renderOrder === undefined ? 0 : renderOrder as number | typeof MIXED_VALUE}
        onChange={(val) => handleRenderPropUpdate('renderOrder', val)}
        step="1"
      />
    </div>
  );
};
