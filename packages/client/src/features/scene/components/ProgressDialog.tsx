import React from 'react';
import { Dialog, DialogProps } from '../../../components/common/Dialog';

export interface ProgressDialogProps extends Omit<DialogProps, 'children'> {
  percentage: number;
  currentTask?: string;
}

export const ProgressDialog: React.FC<ProgressDialogProps> = ({
  percentage,
  currentTask,
  ...dialogProps
}) => {
  return (
    <Dialog {...dialogProps} closeOnOverlayClick={false}>
      <div className="flex flex-col gap-4 min-w-[400px]">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-text-secondary">导入进度</span>
            <span className="text-sm font-semibold text-accent-blue">{percentage}%</span>
          </div>

          <div className="w-full h-2 bg-input-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-blue transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {currentTask && (
          <p className="text-xs text-text-primary">{currentTask}</p>
        )}
      </div>
    </Dialog>
  );
};
