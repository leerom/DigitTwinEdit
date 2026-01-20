import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import * as THREE from 'three';

const AxisInput = ({ label, value, onChange, color }: any) => (
  <div className="flex items-center gap-2">
    <div className={`w-4 text-center text-xs font-bold select-none ${color}`}>{label}</div>
    <input
      type="number"
      step={0.1}
      className="flex-1 bg-[#111] border border-gray-700 rounded px-1 py-0.5 text-xs text-white focus:border-blue-500 focus:outline-none"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);

const Vector3Input = ({ label, value, onChange }: any) => {
  const handleChange = (axis: number, val: number) => {
    const newValue = [...value];
    newValue[axis] = val;
    onChange(newValue);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-gray-400 uppercase font-semibold">{label}</div>
      <div className="flex gap-2">
        <AxisInput label="X" value={Math.round(value[0]*100)/100} onChange={(v: number) => handleChange(0, v)} color="text-red-500" />
        <AxisInput label="Y" value={Math.round(value[1]*100)/100} onChange={(v: number) => handleChange(1, v)} color="text-green-500" />
        <AxisInput label="Z" value={Math.round(value[2]*100)/100} onChange={(v: number) => handleChange(2, v)} color="text-blue-500" />
      </div>
    </div>
  );
};

export const TransformProp: React.FC<{ objectId: string }> = ({ objectId }) => {
  const object = useSceneStore((state) => state.scene.objects[objectId]);
  const updateTransform = useSceneStore((state) => state.updateTransform);

  if (!object) return null;

  const { position, rotation, scale } = object.transform;

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-bold text-gray-200">TRANSFORM</div>

      <Vector3Input
        label="Position"
        value={position}
        onChange={(v: number[]) => updateTransform(objectId, { position: v as any })}
      />
      <Vector3Input
        label="Rotation"
        value={rotation} // Euler in radians. UI usually shows Degrees.
        onChange={(v: number[]) => updateTransform(objectId, { rotation: v as any })}
        // TODO: Convert Radians <-> Degrees for UI
      />
      <Vector3Input
        label="Scale"
        value={scale}
        onChange={(v: number[]) => updateTransform(objectId, { scale: v as any })}
      />
    </div>
  );
};
