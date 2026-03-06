import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useAssetStore } from '@/stores/assetStore';

function isRuntimeIBLAsset(asset: { type: string; metadata?: unknown } | undefined): boolean {
  if (!asset || (asset.type !== 'texture' && asset.type !== 'image')) return false;
  const meta = asset.metadata as Record<string, unknown> | undefined;
  return meta?.usage === 'ibl' && !meta?.isSourceEnvironment && !meta?.isEnvironmentPreview;
}

export const SceneProp: React.FC = () => {
  const environment = useSceneStore((s) => s.scene.settings.environment);
  const backgroundColor = useSceneStore((s) => s.scene.settings.backgroundColor);
  const shadowMapType = useSceneStore((s) => s.scene.settings.shadowMapType ?? 'PCFSoftShadowMap');
  const setDefaultEnvironment = useSceneStore((s) => s.setDefaultEnvironment);
  const setEnvironmentAsset = useSceneStore((s) => s.setEnvironmentAsset);
  const updateSceneSettings = useSceneStore((s) => s.updateSceneSettings);

  const assets = useAssetStore((s) => s.assets);
  const environmentAssets = assets.filter(isRuntimeIBLAsset);
  const activeEnvironmentAsset = environment?.assetId
    ? assets.find((a) => a.id === environment.assetId)
    : undefined;

  return (
    <div className="p-4 space-y-5">
      {/* 环境贴图 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-xs text-primary">hdr_strong</span>
          <h3 className="text-[11px] font-bold text-slate-300">场景环境 (Environment)</h3>
        </div>
        <div className="rounded border border-border-dark bg-header-dark/30 p-3 space-y-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">当前模式</span>
            <span className="text-slate-300">
              {environment?.mode === 'asset' && activeEnvironmentAsset
                ? `环境贴图 · ${activeEnvironmentAsset.name}`
                : '默认环境'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={setDefaultEnvironment}
              className="px-2.5 py-1 rounded border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
            >
              使用默认环境
            </button>
            {environmentAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setEnvironmentAsset(asset.id)}
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

      {/* 背景颜色 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-xs text-primary">format_color_fill</span>
          <h3 className="text-[11px] font-bold text-slate-300">背景颜色 (Background)</h3>
        </div>
        <div className="rounded border border-border-dark bg-header-dark/30 p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">颜色</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => updateSceneSettings({ backgroundColor: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border border-border-dark bg-transparent"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => {
                  if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
                    updateSceneSettings({ backgroundColor: e.target.value });
                  }
                }}
                className="w-20 bg-[#0c0e14] border border-border-dark text-white text-xs px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 阴影类型 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-xs text-primary">shadow</span>
          <h3 className="text-[11px] font-bold text-slate-300">阴影 (Shadows)</h3>
        </div>
        <div className="rounded border border-border-dark bg-header-dark/30 p-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">阴影算法</span>
            <select
              value={shadowMapType}
              onChange={(e) =>
                updateSceneSettings({
                  shadowMapType: e.target.value as 'PCFSoftShadowMap' | 'PCFShadowMap' | 'VSMShadowMap',
                })
              }
              className="bg-[#0c0e14] border border-border-dark text-white text-xs px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="PCFSoftShadowMap">PCFSoft（柔和，推荐）</option>
              <option value="PCFShadowMap">PCF（标准）</option>
              <option value="VSMShadowMap">VSM（方差）</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
