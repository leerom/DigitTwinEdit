import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface DialogProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  closeOnOverlayClick = true,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && onClose && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        className={twMerge(
          "bg-panel-bg border border-border-default rounded-lg shadow-2xl min-w-[320px] max-w-2xl",
          className
        )}
      >
        {title && (
          <div className="px-4 py-3 border-b border-border-default">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};
