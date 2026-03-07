import React from 'react';

interface EnvironmentAssetSummary {
  id: number;
  name: string;
}

interface SceneEnvironmentPropProps {
  mode?: 'default' | 'asset';
  activeAssetId?: number;
  environmentAssets: EnvironmentAssetSummary[];
  onUseDefault: () => void;
  onSelectAsset: (assetId: number) => void;
}

export const SceneEnvironmentProp: React.FC<SceneEnvironmentPropProps> = ({
  mode,
  activeAssetId,
  environmentAssets,
  onUseDefault,
  onSelectAsset,
}) => {
  const selectValue = mode === 'asset' && activeAssetId != null ? String(activeAssetId) : '';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '') {
      onUseDefault();
    } else {
      onSelectAsset(Number(e.target.value));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-xs text-primary">hdr_strong</span>
        <h3 className="text-[11px] font-bold text-slate-300">场景环境 (Environment)</h3>
      </div>

      <div className="rounded border border-border-dark bg-header-dark/30 p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 shrink-0">环境贴图</span>
          <select
            value={selectValue}
            onChange={handleChange}
            className="flex-1 min-w-0 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-[11px] focus:outline-none focus:border-blue-500"
          >
            <option value="">默认环境</option>
            {environmentAssets.map((asset) => (
              <option key={asset.id} value={String(asset.id)}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>

        {environmentAssets.length === 0 && (
          <p className="text-slate-500 text-[10px]">
            暂无可用环境资产，请先在 Project 面板中导入 HDR/EXR。
          </p>
        )}
      </div>
    </div>
  );
};
