import React, { useState, useEffect } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType } from '@/types';
import { getCommonValue, MIXED_VALUE } from '../utils/inspectorUtils';
import { Input } from '@/components/common/Input';

interface CameraPropProps {
  objectIds: string[];
}

interface NumberInputProps {
  label: string;
  value: number | string | typeof MIXED_VALUE;
  onChange: (value: number) => void;
  step?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, step = "0.1" }) => {
  const [localValue, setLocalValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value === MIXED_VALUE ? '' : String(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);

    // If empty and was mixed, stay mixed (do nothing)
    // If empty and was not mixed, maybe invalid? Or allow clearing?
    // Usually number fields reset to previous value if invalid.
    if (localValue === '' && value === MIXED_VALUE) return;

    const num = parseFloat(localValue);
    if (!isNaN(num)) {
        // Only update if value actually changed to avoid unnecessary updates
        if (value === MIXED_VALUE || num !== Number(value)) {
            onChange(num);
        }
    } else {
      // Reset on invalid input
      setLocalValue(value === MIXED_VALUE ? '' : String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <Input
      label={label}
      value={localValue}
      placeholder={value === MIXED_VALUE ? MIXED_VALUE : undefined}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={() => setIsFocused(true)}
      onKeyDown={handleKeyDown}
      type="number"
      step={step}
    />
  );
};

export const CameraProp: React.FC<CameraPropProps> = ({ objectIds }) => {
  const objects = useSceneStore((state) => state.scene.objects);
  const updateComponent = useSceneStore((state) => state.updateComponent);

  // Filter for valid camera objects
  const selectedCameras = objectIds
    .map((id) => objects[id])
    .filter((obj) => obj && obj.type === ObjectType.CAMERA);

  if (selectedCameras.length === 0) return null;

  // Helper to extract values safely
  const getCameraValue = <K extends keyof NonNullable<typeof selectedCameras[0]['components']>['camera']>(
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
