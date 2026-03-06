import React, { useMemo, useState } from 'react';
import type { Asset } from '@digittwinedit/shared';
import { DEFAULT_IBL_CONVERT_SETTINGS, type IBLConvertSettings } from '../../features/ibl/types';
import { iblConverter } from '../../features/ibl/IBLConverter';
import { useAssetStore } from '../../stores/assetStore';

interface IBLImportPropProps {
  asset: Asset;
  projectId: number;
  onReimportComplete: () => void;
}

export const IBLImportProp: React.FC<IBLImportPropProps> = ({ asset, projectId, onReimportComplete }) => {
  const metadata = asset.metadata as Record<string, unknown> | undefined;
  const isRuntimeIBL = metadata?.usage === 'ibl' && !metadata?.isSourceEnvironment && !metadata?.isEnvironmentPreview;
  const sourceEnvironmentAssetId = metadata?.sourceEnvironmentAssetId as number | undefined;
  const previewAssetId = metadata?.previewAssetId as number | undefined;

  if (!isRuntimeIBL || !sourceEnvironmentAssetId || !previewAssetId) return null;

  const savedSettings = (metadata?.convertSettings as IBLConvertSettings | undefined) ?? DEFAULT_IBL_CONVERT_SETTINGS;

  return (
    <IBLImportPropContent
      asset={asset}
      projectId={projectId}
      sourceEnvironmentAssetId={sourceEnvironmentAssetId}
      previewAssetId={previewAssetId}
      savedSettings={savedSettings}
      onReimportComplete={onReimportComplete}
    />
  );
};

interface ContentProps {
  asset: Asset;
  projectId: number;
  sourceEnvironmentAssetId: number;
  previewAssetId: number;
  savedSettings: IBLConvertSettings;
  onReimportComplete: () => void;
}

const IBLImportPropContent: React.FC<ContentProps> = ({
  asset,
  projectId,
  sourceEnvironmentAssetId,
  previewAssetId,
  savedSettings,
  onReimportComplete,
}) => {
  const [localSettings, setLocalSettings] = useState<IBLConvertSettings>(savedSettings);
  const [isReimporting, setIsReimporting] = useState(false);
  const [reimportProgress, setReimportProgress] = useState('');
  const [reimportError, setReimportError] = useState<string | null>(null);
  const loadAssets = useAssetStore((state) => state.loadAssets);
  const assets = useAssetStore((state) => state.assets);
  const metadata = asset.metadata as Record<string, unknown> | undefined;

  const sourceExists = assets.some((a) => a.id === sourceEnvironmentAssetId);
  const previewExists = assets.some((a) => a.id === previewAssetId);

  React.useEffect(() => {
    setLocalSettings(savedSettings);
  }, [savedSettings]);

  const isDirty = useMemo(
    () => JSON.stringify(localSettings) !== JSON.stringify(savedSettings),
    [localSettings, savedSettings]
  );

  const set = <K extends keyof IBLConvertSettings>(key: K, value: IBLConvertSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleReimport = async () => {
    setIsReimporting(true);
    setReimportProgress('');
    setReimportError(null);
    try {
      await iblConverter.reimport(
        asset,
        localSettings,
        (progress) => setReimportProgress(`${progress.step} (${progress.percent}%)`)
      );
      await loadAssets?.(projectId, 'texture');
      onReimportComplete();
    } catch (error) {
      setReimportError(error instanceof Error ? error.message : '重新导入失败，请重试');
    } finally {
      setIsReimporting(false);
      setReimportProgress('');
    }
  };

  return (
    <div className="border-t border-border-dark pt-4 mt-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-xs text-primary">hdr_strong</span>
        <h3 className="text-[11px] font-bold text-slate-300">环境导入设置</h3>
        {isDirty && (
          <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
            已修改
          </span>
        )}
      </div>

      <div className="space-y-3 text-xs">
        <div className="space-y-2 text-slate-400">
          <div className="flex items-center justify-between">
            <span>源文件</span>
            <span className="text-slate-300 font-mono text-[10px]">ID: {sourceEnvironmentAssetId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>原始格式</span>
            <span className="text-slate-300 uppercase">{String(metadata?.originalFormat ?? 'HDR')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>原始尺寸</span>
            <span className="text-slate-300">
              {metadata?.originalDimensions
                ? `${(metadata.originalDimensions as { width: number; height: number }).width} × ${(metadata.originalDimensions as { width: number; height: number }).height}`
                : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>运行时尺寸</span>
            <span className="text-slate-300">
              {metadata?.runtimeDimensions
                ? `${(metadata.runtimeDimensions as { width: number; height: number }).width} × ${(metadata.runtimeDimensions as { width: number; height: number }).height}`
                : '—'}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-slate-400">最大宽度</label>
            <select
              value={localSettings.maxWidth}
              onChange={(e) => set('maxWidth', Number(e.target.value) as IBLConvertSettings['maxWidth'])}
              className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-slate-400">压缩模式</label>
            <select
              value={localSettings.compressionMode}
              onChange={(e) => set('compressionMode', e.target.value as IBLConvertSettings['compressionMode'])}
              className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ETC1S">ETC1S（文件小）</option>
              <option value="UASTC">UASTC（质量高）</option>
            </select>
          </div>

          <label className="flex items-center justify-between text-slate-400 cursor-pointer">
            <span>生成 Mipmap</span>
            <input
              type="checkbox"
              checked={localSettings.generateMipmaps}
              onChange={(e) => set('generateMipmaps', e.target.checked)}
              className="w-3 h-3 accent-primary"
            />
          </label>
        </div>

        {(!sourceExists || !previewExists) && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400">
            <span className="material-symbols-outlined text-xs">warning</span>
            <span>关联源文件或预览图缺失，重新导入前请确认资产完整。</span>
          </div>
        )}

        {reimportError && (
          <div className="px-2 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400">
            {reimportError}
          </div>
        )}

        <div className="pt-1">
          <button
            onClick={handleReimport}
            disabled={!isDirty || isReimporting || !sourceExists || !previewExists}
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
