import React, { useState } from 'react';
import { Dialog } from '../../components/common/Dialog';
import type { FBXImportSettings } from './types';
import { DEFAULT_FBX_IMPORT_SETTINGS } from './types';

interface FBXImportDialogProps {
  isOpen: boolean;
  /** 选择的 FBX 文件名（用于显示） */
  fileName: string;
  onConfirm: (settings: FBXImportSettings) => void;
  onCancel: () => void;
}

export const FBXImportDialog: React.FC<FBXImportDialogProps> = ({
  isOpen,
  fileName,
  onConfirm,
  onCancel,
}) => {
  const [settings, setSettings] = useState<FBXImportSettings>(
    DEFAULT_FBX_IMPORT_SETTINGS
  );

  // 通用的单字段更新函数
  const set = <K extends keyof FBXImportSettings>(
    key: K,
    value: FBXImportSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    onConfirm(settings);
    // 重置为默认值，以便下次打开时是干净的状态
    setSettings(DEFAULT_FBX_IMPORT_SETTINGS);
  };

  const handleCancel = () => {
    setSettings(DEFAULT_FBX_IMPORT_SETTINGS);
    onCancel();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCancel}
      title="导入 FBX 模型"
      closeOnOverlayClick={false}
      className="max-w-[480px] w-full"
    >
      <div className="flex flex-col gap-4">

        {/* 文件名显示 */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded text-xs text-slate-400">
          <span className="material-symbols-outlined text-sm text-primary">deployed_code</span>
          <span className="text-white truncate" title={fileName}>{fileName}</span>
        </div>

        {/* 场景（Scene）设置 */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            场景
          </h3>
          <div className="flex flex-col gap-2 pl-2">

            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">缩放比例</label>
              <input
                type="number"
                value={settings.scale}
                min={0.001}
                max={10000}
                step={0.1}
                onChange={(e) => set('scale', parseFloat(e.target.value) || 1)}
                className="w-24 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">
                转换单位 (1cm → 0.01m)
              </label>
              <input
                type="checkbox"
                checked={settings.convertUnits}
                onChange={(e) => set('convertUnits', e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
            </div>
          </div>
        </section>

        {/* 几何（Geometry）设置 */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            几何
          </h3>
          <div className="flex flex-col gap-2 pl-2">

            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">法线</label>
              <select
                value={settings.normals}
                onChange={(e) =>
                  set('normals', e.target.value as FBXImportSettings['normals'])
                }
                className="w-36 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="import">导入法线</option>
                <option value="calculate">计算法线</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label
                className={`text-xs ${
                  settings.normals !== 'calculate'
                    ? 'text-slate-600'
                    : 'text-slate-300'
                }`}
              >
                法线模式
              </label>
              <select
                value={settings.normalsMode}
                disabled={settings.normals !== 'calculate'}
                onChange={(e) =>
                  set(
                    'normalsMode',
                    e.target.value as FBXImportSettings['normalsMode']
                  )
                }
                className="w-36 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="unweighted">不加权</option>
                <option value="areaWeighted">面积加权</option>
                <option value="angleWeighted">顶角加权</option>
                <option value="areaAndAngle">面积和顶角加权</option>
              </select>
            </div>
          </div>
        </section>

        {/* 保存（Save）设置 */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            保存
          </h3>
          <div className="flex flex-col gap-2 pl-2">

            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">保存格式</label>
              <select
                value={settings.saveFormat}
                onChange={(e) =>
                  set(
                    'saveFormat',
                    e.target.value as FBXImportSettings['saveFormat']
                  )
                }
                className="w-36 px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="glb">.glb（二进制，默认）</option>
                <option value="gltf">.gltf（JSON）</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-300">嵌入纹理资源</label>
              <input
                type="checkbox"
                checked={settings.embedTextures}
                onChange={(e) => set('embedTextures', e.target.checked)}
                className="w-4 h-4 accent-blue-500"
              />
            </div>
          </div>
        </section>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors font-medium"
          >
            导入
          </button>
        </div>
      </div>
    </Dialog>
  );
};
