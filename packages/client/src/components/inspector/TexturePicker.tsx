import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAssetStore } from '@/stores/assetStore';
import { assetsApi } from '@/api/assets';

export interface TextureRef {
  assetId: number;
  url: string;
  /** 资产的 MIME 类型，用于在 materialFactory 中判断是否为 KTX2 */
  mimeType?: string;
}

interface TexturePickerProps {
  label: string;
  value: TextureRef | null;
  onChange: (value: TextureRef | null) => void;
  projectId: number;
}

export const TexturePicker: React.FC<TexturePickerProps> = ({
  label,
  value,
  onChange,
  projectId,
}) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const assets = useAssetStore((s) => s.assets);
  const loadAssets = useAssetStore((s) => s.loadAssets);

  // 只显示可用的纹理：排除 isSourceTexture（仅作为原始文件保留的 PNG/JPG）
  // 这与 ProjectPanel 的 displayAssets 过滤逻辑保持一致
  const textureAssets = assets.filter((a) => {
    if (a.type !== 'texture' && (a.type as string) !== 'image') return false;
    const meta = a.metadata as Record<string, unknown> | undefined;
    return !meta?.isSourceTexture;
  });

  // 点击弹出层外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (asset: { id: number; updated_at: string; mime_type?: string }) => {
    const url = `${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`;
    onChange({ assetId: asset.id, url, mimeType: asset.mime_type });
    setOpen(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const asset = await assetsApi.uploadAsset(projectId, file, 'texture');
      await loadAssets(projectId);
      handleSelect(asset);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 已选中时显示缩略图
  const selectedAsset = value
    ? assets.find((a) => a.id === value.assetId)
    : undefined;

  // KTX2 贴图浏览器无法直接渲染为 <img>，改用其对应的源 PNG/JPG 作为缩略图。
  // 若找不到源图（如独立上传的 KTX2），则降级为占位符。
  const thumbnailUrl = useMemo(() => {
    if (!value) return null;
    if (value.mimeType !== 'image/ktx2') return value.url;
    const meta = selectedAsset?.metadata as Record<string, unknown> | undefined;
    const sourceId = meta?.sourceTextureAssetId as number | undefined;
    if (sourceId) {
      const sourceAsset = assets.find((a) => a.id === sourceId);
      if (sourceAsset) {
        return `${assetsApi.getAssetDownloadUrl(sourceId)}?v=${new Date(sourceAsset.updated_at).getTime()}`;
      }
    }
    return null;
  }, [value, selectedAsset, assets]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] text-[#999999] font-medium shrink-0">{label}</label>
        <div className="flex items-center gap-1.5 min-w-0">
          {/* 缩略图或占位 */}
          {value ? (
            thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                crossOrigin="use-credentials"
                alt={selectedAsset?.name ?? '贴图'}
                className="w-8 h-8 object-cover rounded border border-white/10"
              />
            ) : (
              // KTX2 格式且无源图 → 占位符
              <div className="w-8 h-8 bg-slate-800 rounded border border-white/10 flex flex-col items-center justify-center gap-0.5">
                <span className="text-[7px] font-bold text-primary/80 leading-none">KTX2</span>
              </div>
            )
          ) : (
            <span className="text-[10px] text-slate-500 italic">无</span>
          )}
          {/* 清除按钮 */}
          {value && (
            <button
              aria-label="清除贴图"
              onClick={() => onChange(null)}
              className="text-slate-500 hover:text-white text-xs leading-none"
            >
              ×
            </button>
          )}
          {/* 选择按钮 */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-[10px] text-primary hover:text-primary/80 border border-primary/30 rounded px-1.5 py-0.5"
          >
            选择
          </button>
        </div>
      </div>

      {/* 弹出层 */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-1 z-50 w-64 bg-[#1a1d26] border border-[#2d333f] rounded shadow-lg p-2"
        >
          {/* 上传 */}
          <label className="block mb-2 cursor-pointer">
            <span className="text-[10px] text-primary hover:underline">
              {uploading ? '上传中…' : '+ 上传图片'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>

          {/* 资产列表 */}
          {textureAssets.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-4">暂无贴图资产</p>
          ) : (
            <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
              {textureAssets.map((asset) => {
                const isKtx2 = asset.mime_type === 'image/ktx2';
                return (
                  <button
                    key={asset.id}
                    title={asset.name}
                    onClick={() => handleSelect(asset)}
                    className={`
                      relative rounded border overflow-hidden
                      ${value?.assetId === asset.id
                        ? 'border-primary'
                        : 'border-white/10 hover:border-white/30'}
                    `}
                  >
                    {isKtx2 ? (
                      // KTX2 浏览器无法直接渲染为 <img>，显示格式标签占位
                      <div className="w-full h-14 bg-slate-800 flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[9px] font-bold text-primary/80">KTX2</span>
                        <span className="material-symbols-outlined text-slate-500 text-base">texture</span>
                      </div>
                    ) : (
                      <img
                        src={`${assetsApi.getAssetDownloadUrl(asset.id)}?v=${new Date(asset.updated_at).getTime()}`}
                        alt={asset.name}
                        crossOrigin="use-credentials"
                        className="w-full h-14 object-cover"
                      />
                    )}
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white truncate px-0.5 py-0.5">
                      {asset.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
