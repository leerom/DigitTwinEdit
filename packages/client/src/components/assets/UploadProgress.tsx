import React from 'react';
import type { UploadProgress } from '@digittwinedit/shared';

interface UploadProgressBarProps {
  filename: string;
  progress: UploadProgress;
}

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({ filename, progress }) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="bg-bg-dark border border-border-dark rounded p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 truncate flex-1" title={filename}>
          {filename}
        </span>
        <span className="text-slate-500 ml-2">
          {Math.round(progress.percent)}%
        </span>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{formatBytes(progress.loaded)} / {formatBytes(progress.total)}</span>
      </div>
    </div>
  );
};

interface UploadProgressListProps {
  uploads: Record<string, UploadProgress>;
}

export const UploadProgressList: React.FC<UploadProgressListProps> = ({ uploads }) => {
  const uploadEntries = Object.entries(uploads);

  if (uploadEntries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 p-4 border-t border-border-dark">
      <div className="text-xs text-slate-400 mb-2">正在上传 ({uploadEntries.length})</div>
      {uploadEntries.map(([filename, progress]) => (
        <UploadProgressBar key={filename} filename={filename} progress={progress} />
      ))}
    </div>
  );
};
