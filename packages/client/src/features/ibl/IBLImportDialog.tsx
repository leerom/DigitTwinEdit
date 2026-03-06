import React, { useState } from 'react';
import { Dialog } from '../../components/common/Dialog';
import { DEFAULT_IBL_CONVERT_SETTINGS } from './types';
import type { IBLConvertSettings } from './types';

interface IBLImportDialogProps {
  isOpen: boolean;
  fileName: string;
  fileSize: number;
  onConfirm: (settings: IBLConvertSettings) => void;
  onCancel: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${parseFloat((bytes / 1024).toFixed(1))} KB`;
  return `${parseFloat((bytes / 1024 / 1024).toFixed(2))} MB`;
}

export const IBLImportDialog: React.FC<IBLImportDialogProps> = ({
  isOpen,
  fileName,
  fileSize,
  onConfirm,
  onCancel,
}) => {
  const [settings, setSettings] = useState<IBLConvertSettings>(DEFAULT_IBL_CONVERT_SETTINGS);

  const set = <K extends keyof IBLConvertSettings>(key: K, value: IBLConvertSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    onConfirm(settings);
    setSettings(DEFAULT_IBL_CONVERT_SETTINGS);
  };

  const handleCancel = () => {
    setSettings(DEFAULT_IBL_CONVERT_SETTINGS);
    onCancel();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      title="导入环境光（HDR/EXR → KTX2）"
      closeOnOverlayClick={false}
      className="max-w-[520px] w-full"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-800 rounded text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">hdr_strong</span>
            <span className="text-white truncate max-w-[260px]" title={fileName}>{fileName}</span>
          </div>
          <span className="shrink-0 ml-2 text-slate-400">{formatBytes(fileSize)}</span>
        </div>

        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">转换设置</h3>
          <div className="flex flex-col gap-3 pl-2">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>最大宽度</span>
              <select
                value={settings.maxWidth}
                onChange={(event) => set('maxWidth', Number(event.target.value) as IBLConvertSettings['maxWidth'])}
                className="bg-slate-700 text-slate-300 text-xs rounded px-2 py-1"
              >
                <option value={1024}>1024</option>
                <option value={2048}>2048</option>
                <option value={4096}>4096</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>压缩模式</span>
              <select
                value={settings.compressionMode}
                onChange={(event) => set('compressionMode', event.target.value as IBLConvertSettings['compressionMode'])}
                className="bg-slate-700 text-slate-300 text-xs rounded px-2 py-1"
              >
                <option value="UASTC">UASTC</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.generateMipmaps}
                onChange={(event) => set('generateMipmaps', event.target.checked)}
                className="accent-primary"
              />
              生成 Mipmap
            </label>
          </div>
        </section>

        <div className="text-xs text-slate-500 bg-slate-900/70 rounded px-3 py-2 leading-5">
          IBL 第一版仅影响 lighting，不会作为视口背景显示。
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 text-sm text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/80 transition-colors"
          >
            转换并上传
          </button>
        </div>
      </div>
    </Dialog>
  );
};
