import React from 'react';
import { Dialog, DialogProps } from '../../../components/common/Dialog';

export interface ProgressDialogProps extends Omit<DialogProps, 'children'> {
  percentage: number;
  currentTask?: string;
  /** 显示取消按钮（建议仅在 Worker 转换阶段启用，percent < 65） */
  canCancel?: boolean;
  onCancel?: () => void;
}

export const ProgressDialog: React.FC<ProgressDialogProps> = ({
  percentage,
  currentTask,
  canCancel,
  onCancel,
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

        {canCancel && onCancel && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-slate-600 hover:border-slate-400 rounded transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
};
