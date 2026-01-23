import React, { useState, useRef, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { ChevronRight } from 'lucide-react';

export interface DropdownMenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  children?: DropdownMenuItem[];
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item: DropdownMenuItem) => {
    if (item.disabled) return;

    if (item.children) {
      // If it has children, we don't close the main menu immediately
      // interactions are handled by CSS hover for now or separate logic
      return;
    }

    if (item.onClick) {
      item.onClick();
      setIsOpen(false);
    }
  };

  const renderMenuItem = (item: DropdownMenuItem, index: number, isSubmenu: boolean = false) => {
    if (item.children) {
      return (
        <div key={index} className="relative group/submenu w-full">
          <button
            className={twMerge(
              'w-full px-3 py-2 text-left text-xs text-white hover:bg-accent-blue/20 transition-colors flex items-center justify-between gap-2',
              item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
              !isSubmenu && index > 0 && 'border-t border-border-default/50'
            )}
          >
             <div className="flex items-center gap-2">
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                <span>{item.label}</span>
             </div>
             <ChevronRight className="w-3 h-3 text-slate-400" />
          </button>

          <div className="absolute left-full top-0 min-w-[160px] bg-panel-bg border border-border-default rounded shadow-lg hidden group-hover/submenu:block -ml-1">
             {item.children.map((child, idx) => renderMenuItem(child, idx, true))}
          </div>
        </div>
      );
    }

    return (
      <button
        key={index}
        onClick={() => handleItemClick(item)}
        disabled={item.disabled}
        className={twMerge(
          'w-full px-3 py-2 text-left text-xs text-white hover:bg-accent-blue/20 transition-colors flex items-center gap-2',
          item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
          !isSubmenu && index > 0 && 'border-t border-border-default/50'
        )}
      >
        {item.icon && <span className="w-4 h-4">{item.icon}</span>}
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div ref={menuRef} className={twMerge('relative', className)}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-panel-bg border border-border-default rounded shadow-lg z-50">
          {items.map((item, index) => renderMenuItem(item, index))}
        </div>
      )}
    </div>
  );
};
