import React, { useState, useEffect } from 'react';
import { Input } from '@/components/common/Input';
import { MIXED_VALUE } from '../utils/inspectorUtils';

interface NumberInputProps {
  label: string;
  value: number | string | typeof MIXED_VALUE;
  onChange: (value: number) => void;
  step?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, step = "0.1" }) => {
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
