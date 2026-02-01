import React, { useState, useEffect } from 'react';
import { MIXED_VALUE } from '../utils/inspectorUtils';

interface NumberInputProps {
  label: string;
  value: number | string | typeof MIXED_VALUE;
  onChange: (value: number) => void;
  step?: string;
  min?: number;
  max?: number;
  className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  step = "0.1",
  min,
  max,
  className = ""
}) => {
  const [localValue, setLocalValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value === MIXED_VALUE ? '' : String(value));
    }
  }, [value, isFocused]);

  const clamp = (n: number) => {
    if (typeof min === 'number') n = Math.max(min, n);
    if (typeof max === 'number') n = Math.min(max, n);
    return n;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);

    // 实时联动：输入变化就尝试解析并提交（会由命令的 merge 合并成单步撤销）
    if (e.target.value === '' && value === MIXED_VALUE) return;

    const num = parseFloat(e.target.value);
    if (!isNaN(num)) {
      const next = clamp(num);
      if (value === MIXED_VALUE || next !== Number(value)) {
        onChange(next);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);

    if (localValue === '' && value === MIXED_VALUE) return;

    const num = parseFloat(localValue);
    if (!isNaN(num)) {
      const next = clamp(num);
      if (value === MIXED_VALUE || next !== Number(value)) {
        onChange(next);
      }
      // 如果发生 clamp，同步回输入框显示
      if (next !== num) setLocalValue(String(next));
    } else {
      setLocalValue(value === MIXED_VALUE ? '' : String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <label className="text-[11px] text-[#999999] font-medium min-w-[60px]">{label}</label>
      <input
        className="w-full bg-transparent border-none text-[12px] font-mono text-[#3b82f6] focus:outline-none text-left p-0"
        value={localValue}
        placeholder={value === MIXED_VALUE ? MIXED_VALUE : undefined}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        type="number"
        step={step}
        min={min}
        max={max}
      />
    </div>
  );
};
