import React, { useState, useMemo } from 'react';
import type { Asset } from '@digittwinedit/shared';
import type { FBXImportSettings } from '../../features/fbx/types';
import { DEFAULT_FBX_IMPORT_SETTINGS } from '../../features/fbx/types';
import { fbxImporter } from '../../features/fbx/FBXImporter';
import { useAssetStore } from '../../stores/assetStore';
interface ModelImportPropProps {
  asset: Asset;
  projectId: number;
  /**
   * 重新导入完成后的回调（由 Task 2.5 接入，现在先预留接口）
   * 将由父组件（InspectorPanel）传入，用于刷新资产列表
   */
  onReimportComplete: () => void;
}

/**
 * Inspector 中的「模型导入设置」区域
 *
 * 仅当资产元数据中有 sourceFbxAssetId 时才渲染（即通过 FBX 导入的 GLB）。
 */
export const ModelImportProp: React.FC<ModelImportPropProps> = ({
  asset,
  projectId,
  onReimportComplete,
}) => {
  const metadata = asset.metadata as Record<string, unknown> | undefined;
  const sourceFbxAssetId = metadata?.sourceFbxAssetId as number | undefined;

  // 如果不是 FBX 导入的模型，不渲染
  if (!sourceFbxAssetId) return null;

  // 从元数据中读取保存的导入设置（可能是旧版未保存的资产，用默认值兜底）
  const savedSettings = (metadata?.importSettings as FBXImportSettings | undefined)
    ?? DEFAULT_FBX_IMPORT_SETTINGS;

  return (
    <ModelImportPropContent
      asset={asset}
      projectId={projectId}
      sourceFbxAssetId={sourceFbxAssetId}
      savedSettings={savedSettings}
      onReimportComplete={onReimportComplete}
    />
  );
};

// 内部组件，确保 hooks 在条件判断之后调用（满足 Rules of Hooks）
interface ContentProps {
  asset: Asset;
  projectId: number;
  sourceFbxAssetId: number;
  savedSettings: FBXImportSettings;
  onReimportComplete: () => void;
}

const ModelImportPropContent: React.FC<ContentProps> = ({
  asset,
  projectId,
  sourceFbxAssetId,
  savedSettings,
  onReimportComplete,
}) => {
  const [localSettings, setLocalSettings] = useState<FBXImportSettings>(savedSettings);
  const [isReimporting, setIsReimporting] = useState(false);
  const [reimportProgress, setReimportProgress] = useState('');
  const loadAssets = useAssetStore((state) => state.loadAssets);
  const assets = useAssetStore((state) => state.assets);

  // 检查源 FBX 是否仍存在（避免用户重新导入时遭遇 404）
  const sourceFbxExists = assets.some((a) => a.id === sourceFbxAssetId);

  // 当服务端数据更新后（重新导入完成），同步本地设置以清除 dirty 状态
  React.useEffect(() => {
    setLocalSettings(savedSettings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(savedSettings)]);

  // 检测是否有未保存的修改（与 savedSettings 对比）
  const isDirty = useMemo(
    () => JSON.stringify(localSettings) !== JSON.stringify(savedSettings),
    [localSettings, savedSettings]
  );

  const set = <K extends keyof FBXImportSettings>(key: K, value: FBXImportSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleReimport = async () => {
    setIsReimporting(true);
    setReimportProgress('');
    try {
      await fbxImporter.reimport(
        projectId,
        asset,
        localSettings,
        (progress) => setReimportProgress(`${progress.step} (${progress.percent}%)`)
      );
      // 刷新资产列表（让 InspectorPanel 获得新的 asset 数据）
      await loadAssets(projectId, 'model');
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
        <span className="material-symbols-outlined text-xs text-primary">deployed_code</span>
        <h3 className="text-[11px] font-bold text-slate-300">模型导入设置</h3>
        {isDirty && (
          <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
            已修改
          </span>
        )}
      </div>

      <div className="space-y-3 text-xs">
        {/* 来源文件 */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500">来源 FBX</span>
          <span className="text-slate-400 font-mono text-[10px]">
            ID: {sourceFbxAssetId}
          </span>
        </div>

        <div className="border-t border-slate-800 pt-2">
          {/* 场景 */}
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            场景
          </p>

          <div className="space-y-1.5 pl-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-400">缩放比例</label>
              <input
                type="number"
                value={localSettings.scale}
                min={0.001}
                max={10000}
                step={0.1}
                onChange={(e) => set('scale', parseFloat(e.target.value) || 1)}
                className="w-20 px-1.5 py-0.5 text-xs bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-slate-400">转换单位</label>
              <input
                type="checkbox"
                checked={localSettings.convertUnits}
                onChange={(e) => set('convertUnits', e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-2">
          {/* 几何 */}
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            几何
          </p>

          <div className="space-y-1.5 pl-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-400">法线</label>
              <select
                value={localSettings.normals}
                onChange={(e) =>
                  set('normals', e.target.value as FBXImportSettings['normals'])
                }
                className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="import">导入法线</option>
                <option value="calculate">计算法线</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label
                className={
                  localSettings.normals !== 'calculate'
                    ? 'text-slate-600'
                    : 'text-slate-400'
                }
              >
                法线模式
              </label>
              <select
                value={localSettings.normalsMode}
                disabled={localSettings.normals !== 'calculate'}
                onChange={(e) =>
                  set('normalsMode', e.target.value as FBXImportSettings['normalsMode'])
                }
                className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500 disabled:opacity-40"
              >
                <option value="unweighted">不加权</option>
                <option value="areaWeighted">面积加权</option>
                <option value="angleWeighted">顶角加权</option>
                <option value="areaAndAngle">面积和顶角</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-2">
          {/* 保存 */}
          <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            保存
          </p>

          <div className="space-y-1.5 pl-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-400">格式</label>
              <select
                value={localSettings.saveFormat}
                onChange={(e) =>
                  set('saveFormat', e.target.value as FBXImportSettings['saveFormat'])
                }
                className="w-28 px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="glb">.glb（默认）</option>
                <option value="gltf">.gltf</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-slate-400">嵌入纹理</label>
              <input
                type="checkbox"
                checked={localSettings.embedTextures}
                onChange={(e) => set('embedTextures', e.target.checked)}
                className="w-3.5 h-3.5 accent-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 重新导入按钮 */}
        <div className="pt-2">
          {!sourceFbxExists && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2 bg-red-500/10 border border-red-500/30 rounded text-[10px] text-red-400">
              <span className="material-symbols-outlined text-xs">warning</span>
              <span>源 FBX 已删除，无法重新导入</span>
            </div>
          )}
          <button
            onClick={handleReimport}
            disabled={!isDirty || isReimporting || !sourceFbxExists}
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
