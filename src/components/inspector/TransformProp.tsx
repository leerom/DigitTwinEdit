import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { MIXED_VALUE, getCommonValue, radToDeg, degToRad } from './utils/inspectorUtils';

// Styled Axis Input with colored labels
const AxisInput = ({ label, value, onChange, colorLabel }: { label: string, value: number | string, onChange: (val: number) => void, colorLabel: string }) => {
  const [localValue, setLocalValue] = React.useState<string>('');

  React.useEffect(() => {
    if (value === MIXED_VALUE) {
      setLocalValue('');
    } else {
      setLocalValue(String(Math.round((value as number) * 100) / 100));
    }
  }, [value]);

  const commit = () => {
    if (localValue === '') return;
    const num = parseFloat(localValue);
    if (!isNaN(num)) {
      onChange(num);
    } else {
      setLocalValue(value === MIXED_VALUE ? '' : String(Math.round((value as number) * 100) / 100));
    }
  };

  return (
    <div className="relative flex-1 min-w-0">
      <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold select-none ${colorLabel}`}>{label}</span>
      <input
        type="text"
        className="w-full pl-5 pr-1 py-1 bg-[#0c0e14] border-none rounded-sm text-[10px] font-mono text-[#cccccc] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/50 transition-all text-left"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
            commit();
          }
        }}
        placeholder={value === MIXED_VALUE ? MIXED_VALUE : undefined}
      />
    </div>
  );
};

const Vector3Input = ({ label, value, onChange }: { label: string, value: (number | string)[], onChange: (newValue: (number | string)[]) => void }) => {
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
        <AxisInput label="X" value={value[0]} onChange={(v) => handleChange(0, v)} colorLabel="text-[#ff4d4d]" />
        <AxisInput label="Y" value={value[1]} onChange={(v) => handleChange(1, v)} colorLabel="text-[#4dff4d]" />
        <AxisInput label="Z" value={value[2]} onChange={(v) => handleChange(2, v)} colorLabel="text-[#4d79ff]" />
      </div>
    </div>
  );
};

export const TransformProp: React.FC<{ objectIds: string[] }> = ({ objectIds }) => {
  const objects = useSceneStore((state) => state.scene.objects);
  const updateTransform = useSceneStore((state) => state.updateTransform);

  // Filter valid objects
  const selectedObjects = objectIds.map(id => objects[id]).filter(Boolean);

  if (selectedObjects.length === 0) return null;

  // Calculate common values
  const positions = selectedObjects.map(o => o.transform.position);
  const rotations = selectedObjects.map(o => o.transform.rotation); // Radians
  const scales = selectedObjects.map(o => o.transform.scale);

  const commonPosition = [
    getCommonValue(positions.map(p => p[0])),
    getCommonValue(positions.map(p => p[1])),
    getCommonValue(positions.map(p => p[2]))
  ];

  const commonRotationDeg = [
    getCommonValue(rotations.map(r => radToDeg(r[0]))),
    getCommonValue(rotations.map(r => radToDeg(r[1]))),
    getCommonValue(rotations.map(r => radToDeg(r[2])))
  ];

  const commonScale = [
    getCommonValue(scales.map(s => s[0])),
    getCommonValue(scales.map(s => s[1])),
    getCommonValue(scales.map(s => s[2]))
  ];

  const handleUpdate = (type: 'position' | 'rotation' | 'scale', newValue: (number | string)[]) => {
    selectedObjects.forEach(obj => {
      const current = obj.transform[type];
      const next = [...current];

      // Update only specific axes that have numeric values.
      // If a value is MIXED_VALUE, preserve the object's original value for that axis.

      const finalVector = [
        typeof newValue[0] === 'number' ? (type === 'rotation' ? degToRad(newValue[0] as number) : newValue[0]) : next[0],
        typeof newValue[1] === 'number' ? (type === 'rotation' ? degToRad(newValue[1] as number) : newValue[1]) : next[1],
        typeof newValue[2] === 'number' ? (type === 'rotation' ? degToRad(newValue[2] as number) : newValue[2]) : next[2],
      ] as [number, number, number];

      updateTransform(obj.id, { [type]: finalVector });
    });
  };

  return (
    <div className="flex flex-col">
      <div className="pb-2">
        <Vector3Input
            label="位置 P"
            value={commonPosition}
            onChange={(v) => handleUpdate('position', v)}
        />
        <Vector3Input
            label="旋转 R"
            value={commonRotationDeg}
            onChange={(v) => handleUpdate('rotation', v)}
        />
        <Vector3Input
            label="缩放 S"
            value={commonScale}
            onChange={(v) => handleUpdate('scale', v)}
        />
      </div>
    </div>
  );
};
