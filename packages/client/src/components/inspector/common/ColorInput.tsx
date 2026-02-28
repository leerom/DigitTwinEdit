import React from 'react';

interface ColorInputProps {
  label: string;
  value: string;   // hex string, e.g. "#ffffff"
  onChange: (value: string) => void;
}

export const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <label className="text-[11px] text-[#999999] font-medium">{label}</label>
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-6 bg-transparent border-0 p-0 cursor-pointer"
      />
      <span className="text-[10px] font-mono text-slate-400">{value}</span>
    </div>
  </div>
);
