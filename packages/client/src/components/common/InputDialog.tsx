import React, { useState, useEffect } from 'react';
import { Dialog } from './Dialog';
import { Input } from './Input';

interface InputDialogProps {
  isOpen: boolean;
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const InputDialog: React.FC<InputDialogProps> = ({
  isOpen,
  title,
  placeholder,
  defaultValue = '',
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError('');
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    if (!value.trim()) {
      setError('名称不能为空');
      return;
    }
    onConfirm(value.trim());
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      className="max-w-[400px]"
    >
      <div className="flex flex-col gap-4">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError('');
          }}
          placeholder={placeholder}
          error={error}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            } else if (e.key === 'Escape') {
              onCancel();
            }
          }}
        />
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 text-xs bg-accent-blue hover:bg-accent-blue/90 text-white rounded transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
