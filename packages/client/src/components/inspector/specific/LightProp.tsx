import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType, LightComponent } from '@/types';
import { getCommonValue, MIXED_VALUE } from '../utils/inspectorUtils';
import { NumberInput } from '../common/NumberInput';

interface LightPropProps {
  objectIds: string[];
}

export const LightProp: React.FC<LightPropProps> = ({ objectIds }) => {
  const objects = useSceneStore((state) => state.scene.objects);
  const updateComponent = useSceneStore((state) => state.updateComponent);

  // Filter for valid light objects
  const selectedLights = objectIds
    .map((id) => objects[id])
    .filter((obj) => obj && obj.type === ObjectType.LIGHT);

  if (selectedLights.length === 0) return null;

  // Helper to extract values safely
  const getLightValue = <K extends keyof LightComponent>(
    key: K
  ) => {
    const values = selectedLights.map((obj) => obj.components?.light?.[key]);
    // Filter out undefined values to handle cases where light component might be partial or missing properties
    const definedValues = values.filter((v): v is NonNullable<typeof v> => v !== undefined);

    // If we have no values (e.g. all undefined for an optional prop), return undefined or a default
    if (definedValues.length === 0) return undefined;

    // If we have mixed presence (some undefined, some defined), that is also a MIXED state technically
    if (definedValues.length !== selectedLights.length) return MIXED_VALUE;

    return getCommonValue(definedValues);
  };

  const type = getLightValue('type');
  const intensity = getLightValue('intensity');
  const distance = getLightValue('range'); // 'range' in Three.js/types, often called distance in UI
  const decay = getLightValue('decay');
  const angle = getLightValue('angle');
  const castShadow = getLightValue('castShadow');
  const color = getLightValue('color');

  // 阴影属性（仅直射光）
  const shadowCameraSize = getLightValue('shadowCameraSize');
  const shadowNear = getLightValue('shadowNear');
  const shadowFar = getLightValue('shadowFar');
  const shadowMapSize = getLightValue('shadowMapSize');
  const shadowBias = getLightValue('shadowBias');
  const shadowNormalBias = getLightValue('shadowNormalBias');
  const shadowRadius = getLightValue('shadowRadius');

  const isDirectional = type === 'directional';
  const showShadowSettings = isDirectional && castShadow === true;

  const supportsRangeDecay = type === 'point' || type === 'spot' || type === MIXED_VALUE;
  const supportsAngle = type === 'spot' || type === MIXED_VALUE;
  const supportsShadow = type !== 'ambient';

  const handleUpdate = (key: string, value: any) => {
    selectedLights.forEach((obj) => {
      updateComponent(obj.id, 'light', { [key]: value });
    });
  };

  return (
    <div className="flex flex-col gap-3">
        <h3 className="text-[11px] font-bold text-slate-300">灯光设置 (Light)</h3>

        {/* Color Picker */}
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">Color</label>
          <div className="flex items-center gap-2">
             <input
                type="color"
                value={color === MIXED_VALUE ? '#000000' : (color as string) || '#ffffff'}
                onChange={(e) => handleUpdate('color', e.target.value)}
                className="w-8 h-6 bg-transparent border-0 p-0 cursor-pointer"
             />
             {color === MIXED_VALUE && <span className="text-xs text-slate-500 italic">Mixed</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <NumberInput
                label="Intensity"
                value={intensity === undefined ? 1 : intensity}
                onChange={(val) => handleUpdate('intensity', val)}
                step="0.1"
            />

            {supportsRangeDecay && (
                <>
                    <NumberInput
                        label="Range"
                        value={distance === undefined ? 0 : distance}
                        onChange={(val) => handleUpdate('range', val)}
                        step="1"
                    />
                    <NumberInput
                        label="Decay"
                        value={decay === undefined ? 1 : decay}
                        onChange={(val) => handleUpdate('decay', val)}
                        step="0.1"
                    />
                </>
            )}

            {supportsAngle && (
                <NumberInput
                    label="Angle"
                    value={angle === undefined ? Math.PI / 3 : angle}
                    onChange={(val) => handleUpdate('angle', val)}
                    step="0.1"
                />
            )}
        </div>

        {supportsShadow && (
             <div className="flex items-center justify-between pt-1">
                <label className="text-xs text-slate-400">Cast Shadow</label>
                <div className="flex items-center">
                     <input
                        type="checkbox"
                        checked={castShadow === true}
                        ref={input => {
                            if (input) input.indeterminate = castShadow === MIXED_VALUE;
                        }}
                        onChange={(e) => handleUpdate('castShadow', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-600 bg-slate-700 text-blue-500 focus:ring-offset-slate-800"
                    />
                    {castShadow === MIXED_VALUE && <span className="ml-2 text-xs text-slate-500 italic">Mixed</span>}
                </div>
            </div>
        )}

        {showShadowSettings && (
          <div className="flex flex-col gap-2 pl-2 border-l border-slate-600 mt-1">
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              阴影设置 (Shadow)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <NumberInput
                label="Camera Size"
                value={shadowCameraSize === undefined ? 10 : shadowCameraSize as number}
                onChange={(val) => handleUpdate('shadowCameraSize', val)}
                step="1"
              />
              <NumberInput
                label="Near"
                value={shadowNear === undefined ? 0.5 : shadowNear as number}
                onChange={(val) => handleUpdate('shadowNear', val)}
                step="0.1"
              />
              <NumberInput
                label="Far"
                value={shadowFar === undefined ? 500 : shadowFar as number}
                onChange={(val) => handleUpdate('shadowFar', val)}
                step="10"
              />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400">Map Resolution</label>
                <select
                  value={shadowMapSize === undefined ? 1024 : shadowMapSize as number}
                  onChange={(e) => handleUpdate('shadowMapSize', Number(e.target.value) as 512 | 1024 | 2048 | 4096)}
                  className="bg-slate-700 border border-slate-600 text-xs text-slate-200 rounded px-1 py-1 w-full"
                >
                  <option value={512}>512</option>
                  <option value={1024}>1024</option>
                  <option value={2048}>2048</option>
                  <option value={4096}>4096</option>
                </select>
              </div>
              <NumberInput
                label="Bias"
                value={shadowBias === undefined ? -0.001 : shadowBias as number}
                onChange={(val) => handleUpdate('shadowBias', val)}
                step="0.001"
              />
              <NumberInput
                label="Normal Bias"
                value={shadowNormalBias === undefined ? 0.02 : shadowNormalBias as number}
                onChange={(val) => handleUpdate('shadowNormalBias', val)}
                step="0.01"
              />
              <NumberInput
                label="Radius"
                value={shadowRadius === undefined ? 1 : shadowRadius as number}
                onChange={(val) => handleUpdate('shadowRadius', val)}
                step="0.5"
              />
            </div>
          </div>
        )}
    </div>
  );
};
