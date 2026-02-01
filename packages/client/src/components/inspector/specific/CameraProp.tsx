import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType, CameraComponent } from '@/types';
import { getCommonValue, MIXED_VALUE } from '../utils/inspectorUtils';
import { NumberInput } from '../common/NumberInput';
import { Checkbox } from '../common/Checkbox';

interface CameraPropProps {
  objectIds: string[];
}

export const CameraProp: React.FC<CameraPropProps> = ({ objectIds }) => {
  const objects = useSceneStore((state) => state.scene.objects);
  const updateComponent = useSceneStore((state) => state.updateComponent);
  const updateObject = useSceneStore((state) => state.updateObject);

  // Filter for valid camera objects
  const selectedCameras = objectIds
    .map((id) => objects[id])
    .filter((obj) => obj && obj.type === ObjectType.CAMERA);

  if (selectedCameras.length === 0) return null;

  // Helper to extract values safely
  const getCameraValue = <K extends keyof CameraComponent>(
    key: K
  ) => {
    const values = selectedCameras.map((obj) => obj.components?.camera?.[key]);
    const definedValues = values.filter((v): v is NonNullable<typeof v> => v !== undefined);

    if (definedValues.length !== selectedCameras.length) {
       // If some are undefined (missing), treat as MIXED or default?
       // For booleans, undefined usually means false or default.
       // Let's assume undefined = false/0/default for safety, or stick to MIXED if truly partial.
       // But often schema evolution means new fields are undefined.
       // Let's use getCommonValue which handles mixed.
       return MIXED_VALUE;
    }

    const first = definedValues[0];
    const isConsistent = definedValues.every(v => v === first);
    return isConsistent ? first : MIXED_VALUE;
  };

  const getObjectValue = <K extends keyof typeof selectedCameras[0]>(
      key: K
  ) => {
      const values = selectedCameras.map(obj => obj[key]);
      const first = values[0];
      const isConsistent = values.every(v => v === first);
      return isConsistent ? first : MIXED_VALUE;
  }

  const fov = getCameraValue('fov');
  const near = getCameraValue('near');
  const far = getCameraValue('far');

  // New fields
  // Default to false/0 if undefined when we read, to allow toggling from "empty" state
  const castShadow = getCameraValue('castShadow') === MIXED_VALUE ? MIXED_VALUE : (getCameraValue('castShadow') || false);
  const receiveShadow = getCameraValue('receiveShadow') === MIXED_VALUE ? MIXED_VALUE : (getCameraValue('receiveShadow') || false);
  const frustumCulled = getCameraValue('frustumCulled') === MIXED_VALUE ? MIXED_VALUE : (getCameraValue('frustumCulled') ?? true); // Default true usually
  const renderOrder = getCameraValue('renderOrder') === MIXED_VALUE ? MIXED_VALUE : (getCameraValue('renderOrder') || 0);

  const visible = getObjectValue('visible');

  const handleUpdate = (key: keyof CameraComponent, value: any) => {
    selectedCameras.forEach((obj) => {
      updateComponent(obj.id, 'camera', { [key]: value });
    });
  };

  const handleObjectUpdate = (key: string, value: any) => {
      selectedCameras.forEach(obj => {
          updateObject(obj.id, { [key]: value });
      });
  }

  return (
    <div className="flex flex-col gap-4 pl-0">
         {/* FOV */}
         <NumberInput
            label="视角"
            value={fov}
            onChange={(val) => handleUpdate('fov', val)}
            step="1"
         />

         {/* Near */}
         <NumberInput
            label="近点"
            value={near}
            onChange={(val) => handleUpdate('near', val)}
            step="0.01"
         />

         {/* Far */}
         <NumberInput
            label="远点"
            value={far}
            onChange={(val) => handleUpdate('far', val)}
            step="10"
         />

         {/* Shadow */}
         <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#999999] font-medium min-w-[60px]">阴影</span>
            <div className="flex space-x-4 w-full">
                <Checkbox
                    label="产生"
                    checked={castShadow}
                    onChange={(val) => handleUpdate('castShadow', val)}
                />
                <Checkbox
                    label="接受"
                    checked={receiveShadow}
                    onChange={(val) => handleUpdate('receiveShadow', val)}
                />
            </div>
         </div>

         {/* Visibility */}
         <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#999999] font-medium min-w-[60px]">可见性</span>
            <div className="w-full flex justify-start">
                 <Checkbox
                    checked={visible as boolean | typeof MIXED_VALUE}
                    onChange={(val) => handleObjectUpdate('visible', val)}
                 />
            </div>
         </div>

         {/* Frustum Culling */}
         <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#999999] font-medium min-w-[60px]">视锥体裁剪</span>
             <div className="w-full flex justify-start">
                 <Checkbox
                    checked={frustumCulled}
                    onChange={(val) => handleUpdate('frustumCulled', val)}
                 />
            </div>
         </div>

         {/* Render Order */}
         <NumberInput
            label="渲染次序"
            value={renderOrder}
            onChange={(val) => handleUpdate('renderOrder', val)}
            step="1"
         />
    </div>
  );
};
