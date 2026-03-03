import React from 'react';
import type { MaterialFieldDef } from '@/features/materials/materialSchema';
import { NumberInput } from './common/NumberInput';
import { ColorInput } from './common/ColorInput';
import { Vector2Field } from './common/Vector2Field';
import { Checkbox } from './common/Checkbox';
import { TexturePicker } from './TexturePicker';
import type { TextureRef } from './TexturePicker';

interface MaterialFieldRendererProps {
  field: MaterialFieldDef;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  projectId: number;
  disabled?: boolean;
}

export const MaterialFieldRenderer: React.FC<MaterialFieldRendererProps> = ({
  field,
  value,
  onChange,
  projectId,
  disabled,
}) => {
  const { key, type, label, min, max, step } = field;

  const inner = (() => {
    switch (type) {
      case 'number':
        return (
          <NumberInput
            label={label}
            value={typeof value === 'number' ? value : 0}
            onChange={(v) => onChange(key, v)}
            step={step !== undefined ? String(step) : '0.01'}
            min={min}
            max={max}
          />
        );

      case 'color':
        return (
          <ColorInput
            label={label}
            value={typeof value === 'string' ? value : '#ffffff'}
            onChange={(v) => onChange(key, v)}
          />
        );

      case 'boolean':
        return (
          <Checkbox
            label={label}
            checked={typeof value === 'boolean' ? value : false}
            onChange={(v) => onChange(key, v)}
          />
        );

      case 'vector2': {
        const v2 = Array.isArray(value) && value.length === 2
          ? (value as [number, number])
          : [0, 0] as [number, number];
        return (
          <Vector2Field
            label={label}
            value={v2}
            onChange={(v) => onChange(key, v)}
            step={step !== undefined ? String(step) : '0.01'}
            min={min}
            max={max}
          />
        );
      }

      case 'texture':
        return (
          <TexturePicker
            label={label}
            value={(value as TextureRef | null) ?? null}
            onChange={(v) => onChange(key, v)}
            projectId={projectId}
          />
        );

      default:
        return null;
    }
  })();

  if (disabled) {
    return <div className="pointer-events-none opacity-50">{inner}</div>;
  }
  return inner;
};
