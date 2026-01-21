import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';

// Styled Axis Input with colored labels
const AxisInput = ({ label, value, onChange, colorLabel }: any) => (
  <div className="relative flex-1 min-w-0">
    <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold select-none ${colorLabel}`}>{label}</span>
    <input
      type="number"
      step={0.1}
      className="w-full pl-5 pr-1 py-1 bg-[#0c0e14] border-none rounded-sm text-[10px] font-mono text-[#cccccc] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/50 transition-all text-left"
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
      <div className="flex items-center justify-between group">
          <span className="text-[10px] text-[#999999] font-medium mb-1">{label}</span>
      </div>
      <div className="flex gap-2">
        <AxisInput label="X" value={Math.round(value[0]*100)/100} onChange={(v: number) => handleChange(0, v)} colorLabel="text-[#ff4d4d]" />
        <AxisInput label="Y" value={Math.round(value[1]*100)/100} onChange={(v: number) => handleChange(1, v)} colorLabel="text-[#4dff4d]" />
        <AxisInput label="Z" value={Math.round(value[2]*100)/100} onChange={(v: number) => handleChange(2, v)} colorLabel="text-[#4d79ff]" />
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
    <div className="flex flex-col">
      <div className="pb-2">
        <Vector3Input
            label="位置 P"
            value={position}
            onChange={(v: number[]) => updateTransform(objectId, { position: v as any })}
        />
        <Vector3Input
            label="旋转 R"
            value={rotation} // Euler in radians. UI usually shows Degrees.
            onChange={(v: number[]) => updateTransform(objectId, { rotation: v as any })}
            // TODO: Convert Radians <-> Degrees for UI
        />
        <Vector3Input
            label="缩放 S"
            value={scale}
            onChange={(v: number[]) => updateTransform(objectId, { scale: v as any })}
        />
      </div>
    </div>
  );
};
