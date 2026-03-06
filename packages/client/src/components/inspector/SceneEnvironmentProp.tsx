import React from 'react';

interface EnvironmentAssetSummary {
  id: number;
  name: string;
}

interface SceneEnvironmentPropProps {
  mode?: 'default' | 'asset';
  activeEnvironmentName?: string;
  environmentAssets: EnvironmentAssetSummary[];
  onUseDefault: () => void;
  onSelectAsset: (assetId: number) => void;
}

export const SceneEnvironmentProp: React.FC<SceneEnvironmentPropProps> = ({
  mode,
  activeEnvironmentName,
  environmentAssets,
  onUseDefault,
  onSelectAsset,
}) => {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-xs text-primary">hdr_strong</span>
        <h3 className="text-[11px] font-bold text-slate-300">场景环境 (Environment)</h3>
      </div>

      <div className="rounded border border-border-dark bg-header-dark/30 p-3 space-y-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">当前模式</span>
          <span className="text-slate-300">
            {mode === 'asset' && activeEnvironmentName ? `环境贴图 · ${activeEnvironmentName}` : '默认环境'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onUseDefault}
            className="px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            使用默认环境
          </button>
          {environmentAssets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onSelectAsset(asset.id)}
              className="px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            >
              {asset.name}
            </button>
          ))}
        </div>

        {environmentAssets.length === 0 && (
          <p className="text-slate-500">暂无可用环境资产，请先在 ProjectPanel 中导入 HDR/EXR。</p>
        )}
      </div>
    </div>
  );
};
