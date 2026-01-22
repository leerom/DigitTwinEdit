import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType, CameraComponent } from '@/types';
import { getCommonValue, MIXED_VALUE } from '../utils/inspectorUtils';
import { NumberInput } from '../common/NumberInput';

interface CameraPropProps {
  objectIds: string[];
}

export const CameraProp: React.FC<CameraPropProps> = ({ objectIds }) => {
  const objects = useSceneStore((state) => state.scene.objects);
  const updateComponent = useSceneStore((state) => state.updateComponent);

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
    // Filter out undefined values to handle cases where camera component might be partial or missing properties
    const definedValues = values.filter((v): v is NonNullable<typeof v> => v !== undefined);

    if (definedValues.length !== selectedCameras.length) {
       return MIXED_VALUE;
    }

    return getCommonValue(definedValues);
  };

  const fov = getCameraValue('fov');
  const near = getCameraValue('near');
  const far = getCameraValue('far');

  const handleUpdate = (key: string, value: number) => {
    selectedCameras.forEach((obj) => {
      updateComponent(obj.id, 'camera', { [key]: value });
    });
  };

  return (
    <div className="flex flex-col gap-3">
        <h3 className="text-[11px] font-bold text-slate-300">相机设置 (Camera)</h3>
        <div className="grid grid-cols-3 gap-2">
            <NumberInput
                label="FOV"
                value={fov}
                onChange={(val) => handleUpdate('fov', val)}
            />
            <NumberInput
                label="Near"
                value={near}
                onChange={(val) => handleUpdate('near', val)}
            />
            <NumberInput
                label="Far"
                value={far}
                onChange={(val) => handleUpdate('far', val)}
            />
        </div>
    </div>
  );
};
