import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs text-text-secondary font-medium">{label}</label>}
      <input
        className={twMerge(
          "bg-input-bg border border-transparent rounded px-2 py-1 text-xs text-white placeholder-text-secondary focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50 transition-colors",
          error && "border-red-500 focus:border-red-500",
          className
        )}
        {...props}
      />
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  );
};
