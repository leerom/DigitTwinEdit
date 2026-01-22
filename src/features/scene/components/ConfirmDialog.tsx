import React from 'react';
import { Dialog, DialogProps } from '../../../components/common/Dialog';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps extends Omit<DialogProps, 'children'> {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  ...dialogProps
}) => {
  const handleConfirm = () => {
    onConfirm();
    dialogProps.onClose?.();
  };

  const handleCancel = () => {
    onCancel?.();
    dialogProps.onClose?.();
  };

  return (
    <Dialog {...dialogProps} closeOnOverlayClick={false}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-text-primary">{message}</p>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 text-xs text-text-secondary hover:text-white bg-transparent border border-border-default rounded hover:bg-accent-blue/10 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs text-white bg-accent-blue hover:bg-accent-blue/80 rounded transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
