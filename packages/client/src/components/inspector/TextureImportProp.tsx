import React, { useState, useMemo } from 'react';
import type { Asset } from '@digittwinedit/shared';
import type { TextureConvertSettings } from '../../features/textures/types';
import { DEFAULT_TEXTURE_CONVERT_SETTINGS } from '../../features/textures/types';
import { textureConverter } from '../../features/textures/TextureConverter';
import { useAssetStore } from '../../stores/assetStore';

interface TextureImportPropProps {
  asset: Asset;
  projectId: number;
  /**
   * 重新导入完成后的回调，由父组件传入，用于刷新资产列表
   */
  onReimportComplete: () => void;
}

/**
 * Inspector 中的「纹理导入设置」区域
 *
 * 仅当资产为 KTX2（mime_type === 'image/ktx2'）且 metadata.sourceTextureAssetId 存在时渲染。
 */
export const TextureImportProp: React.FC<TextureImportPropProps> = ({
  asset,
  projectId,
  onReimportComplete,
}) => {
  const metadata = asset.metadata as Record<string, unknown> | undefined;
  const sourceTextureAssetId = metadata?.sourceTextureAssetId as number | undefined;

  if (asset.mime_type !== 'image/ktx2' || !sourceTextureAssetId) return null;

  const savedSettings = (metadata?.convertSettings as TextureConvertSettings | undefined)
    ?? DEFAULT_TEXTURE_CONVERT_SETTINGS;

  return (
    <TextureImportPropContent
      asset={asset}
      projectId={projectId}
      sourceTextureAssetId={sourceTextureAssetId}
      savedSettings={savedSettings}
      onReimportComplete={onReimportComplete}
    />
  );
};

interface ContentProps {
  asset: Asset;
  projectId: number;
  sourceTextureAssetId: number;
  savedSettings: TextureConvertSettings;
  onReimportComplete: () => void;
}

const TextureImportPropContent: React.FC<ContentProps> = ({
  asset,
  projectId,
  sourceTextureAssetId,
  savedSettings,
  onReimportComplete,
}) => {
  const [localSettings, setLocalSettings] = useState<TextureConvertSettings>(savedSettings);
  const [isReimporting, setIsReimporting] = useState(false);
  const [reimportProgress, setReimportProgress] = useState('');
  const loadAssets = useAssetStore((state) => state.loadAssets);
  const assets = useAssetStore((state) => state.assets);

  const sourceExists = assets.some((a) => a.id === sourceTextureAssetId);

  // 当服务端数据更新后（重新导入完成），同步本地设置以清除 dirty 状态
  React.useEffect(() => {
    setLocalSettings(savedSettings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(savedSettings)]);

  const isDirty = useMemo(
    () => JSON.stringify(localSettings) !== JSON.stringify(savedSettings),
    [localSettings, savedSettings]
  );

  const set = <K extends keyof TextureConvertSettings>(key: K, value: TextureConvertSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleReimport = async () => {
    setIsReimporting(true);
    setReimportProgress('');
    try {
      await textureConverter.reimport(
        asset,
        localSettings,
        (progress) => setReimportProgress(`${progress.step} (${progress.percent}%)`)
      );
      await loadAssets(projectId, 'texture');
      onReimportComplete();
    } catch (err) {
      alert(err instanceof Error ? err.message : '重新导入失败，请重试');
    } finally {
      setIsReimporting(false);
      setReimportProgress('');
    }
  };

  return (
    <div className="border-t border-border-dark pt-4 mt-2">
      {/* 区域标题 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-xs text-primary">image</span>
        <h3 className="text-[11px] font-bold text-slate-300">纹理导入设置</h3>
        {isDirty && (
          <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
            已修改
          </span>
        )}
      </div>

      <div className="space-y-3 text-xs">
        {/* 来源文件 */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500">来源文件</span>
          <span className="text-slate-400 font-mono text-[10px]">
            ID: {sourceTextureAssetId}
          </span>
        </div>

        <div className="border-t border-slate-800 pt-2 space-y-2">
          {/* 压缩模式 */}
          <div className="flex items-center justify-between">
            <label className="text-slate-400">压缩模式</label>
            <select
              value={localSettings.compressionMode}
              onChange={(e) => set('compressionMode', e.target.value as TextureConvertSettings['compressionMode'])}
              className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ETC1S">ETC1S（文件小）</option>
              <option value="UASTC">UASTC（质量高）</option>
            </select>
          </div>

          {/* 质量 */}
          <div className="flex items-center justify-between">
            <label className="text-slate-400">质量等级</label>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min={1}
                max={255}
                value={localSettings.quality}
                onChange={(e) => set('quality', parseInt(e.target.value, 10))}
                className="w-20 accent-primary"
              />
              <input
                type="number"
                min={1}
                max={255}
                value={localSettings.quality}
                onChange={(e) => set('quality', Math.min(255, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="w-12 px-1 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500 text-center"
              />
            </div>
          </div>

          {/* 色彩空间 */}
          <div className="flex items-center justify-between">
            <label className="text-slate-400">色彩空间</label>
            <select
              value={localSettings.colorSpace}
              onChange={(e) => set('colorSpace', e.target.value as TextureConvertSettings['colorSpace'])}
              className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="sRGB">sRGB（颜色贴图）</option>
              <option value="Linear">Linear（法线/粗糙度）</option>
            </select>
          </div>

          {/* POT */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.potResize}
                onChange={(e) => set('potResize', e.target.checked)}
                className="w-3 h-3 accent-primary"
              />
              缩放到 2 的幂次
            </label>
            {localSettings.potResize && (
              <select
                value={localSettings.potMode}
                onChange={(e) => set('potMode', e.target.value as TextureConvertSettings['potMode'])}
                className="w-20 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none"
              >
                <option value="nearest">nearest</option>
                <option value="ceil">ceil</option>
                <option value="floor">floor</option>
              </select>
            )}
          </div>

          {/* Alpha + Mipmap */}
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.hasAlpha}
                onChange={(e) => set('hasAlpha', e.target.checked)}
                className="w-3 h-3 accent-primary"
              />
              含 Alpha
            </label>
            <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.generateMipmaps}
                onChange={(e) => set('generateMipmaps', e.target.checked)}
                className="w-3 h-3 accent-primary"
              />
              生成 Mipmap
            </label>
          </div>
        </div>

        {/* 重新导入按钮 */}
        <div className="pt-1">
          {!sourceExists && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400">
              <span className="material-symbols-outlined text-xs">warning</span>
              <span>源文件已删除，无法重新导入</span>
            </div>
          )}
          <button
            onClick={handleReimport}
            disabled={!isDirty || isReimporting || !sourceExists}
            className="w-full py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {isReimporting ? (
              <>
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                <span>{reimportProgress || '转换中...'}</span>
              </>
            ) : (
              '重新导入'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
