import React from 'react';
import { NumberInput } from './NumberInput';

interface Vector2FieldProps {
  label: string;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: string;
  min?: number;
  max?: number;
}

export const Vector2Field: React.FC<Vector2FieldProps> = ({
  label,
  value,
  onChange,
  step = '0.01',
  min,
  max,
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] text-[#999999] font-medium">{label}</label>
    <div className="flex gap-2">
      <NumberInput
        label="X"
        value={value[0]}
        onChange={(v) => onChange([v, value[1]])}
        step={step}
        min={min}
        max={max}
        className="flex-1"
      />
      <NumberInput
        label="Y"
        value={value[1]}
        onChange={(v) => onChange([value[0], v])}
        step={step}
        min={min}
        max={max}
        className="flex-1"
      />
    </div>
  </div>
);
