import React from 'react';
import { MIXED_VALUE } from '../utils/inspectorUtils';
import { Check } from 'lucide-react';

interface CheckboxProps {
  label?: string;
  checked: boolean | typeof MIXED_VALUE;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false
}) => {
  const isMixed = checked === MIXED_VALUE;
  const isChecked = !isMixed && (checked as boolean);

  return (
    <div className="flex items-center space-x-2">
      <div
        className="relative flex items-center justify-center w-4 h-4"
        onClick={() => !disabled && onChange(isMixed ? true : !isChecked)}
      >
        <input
          type="checkbox"
          className={`
            appearance-none w-4 h-4 rounded border border-slate-600 bg-[#0c0e14]
            checked:bg-primary checked:border-primary
            focus:outline-none focus:ring-1 focus:ring-primary/50
            cursor-pointer transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isMixed ? 'bg-slate-700' : ''}
          `}
          checked={isChecked}
          ref={(input) => {
            if (input) input.indeterminate = isMixed;
          }}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />

        {/* Visible Checkmark Icon */}
        {isChecked && (
          <Check
            className="absolute text-white pointer-events-none"
            size={12}
            strokeWidth={3}
          />
        )}

        {/* Indeterminate dash could be added here too if needed, but browser usually handles it via input styling or we can custom render */}
        {isMixed && (
           <div className="absolute w-2 h-0.5 bg-white pointer-events-none rounded-full" />
        )}
      </div>

      {label && (
        <span
            className="text-[10px] text-slate-400 cursor-pointer select-none hover:text-slate-300 transition-colors"
            onClick={() => !disabled && onChange(isMixed ? true : !isChecked)}
        >
          {label}
        </span>
      )}
    </div>
  );
};
