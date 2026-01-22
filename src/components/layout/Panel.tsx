import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  icon,
  actions,
  children,
  className,
  noPadding = false,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        "flex flex-col h-full w-full bg-panel-dark border-r border-border-dark overflow-hidden flex-shrink-0",
        className
      )}
      {...props}
    >
      {(title || icon || actions) && (
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-secondary px-3 py-2 bg-header-dark border-b border-border-dark flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            {icon && <span className="material-symbols-outlined text-xs">{icon}</span>}
            {title && <span>{title}</span>}
          </div>
          {actions && <div className="flex items-center">{actions}</div>}
        </div>
      )}

      <div className={clsx(
        "flex-1 overflow-auto custom-scrollbar",
        !noPadding && "p-1"
      )}>
        {children}
      </div>
    </div>
  );
};
