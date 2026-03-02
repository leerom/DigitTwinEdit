import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { textureConverter } from './TextureConverter';
import { useProjectStore } from '../../stores/projectStore';
import { useAssetStore } from '../../stores/assetStore';
import type { TextureConvertSettings, TextureConvertProgress } from './types';

/**
 * 纹理导入流程 Hook（供 ProjectPanel 使用）
 *
 * 使用方式：
 *   const tex = useTextureImport();
 *   // 渲染：
 *   <tex.FileInput />
 *   <tex.Dialogs />
 *   // 触发：
 *   <button onClick={tex.trigger}>导入纹理</button>
 */
export function useTextureImport() {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<TextureConvertProgress>({ step: '', percent: 0 });
  const [imageSize, setImageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [conversionError, setConversionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentProject } = useProjectStore();
  const { loadAssets } = useAssetStore();

  /** 触发文件选择对话框 */
  const trigger = () => {
    if (!currentProject) {
      alert('请先选择或创建一个项目');
      return;
    }
    inputRef.current?.click();
  };

  /** input[type=file] onChange 回调 */
  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      textureConverter.validateFile(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : '文件校验失败');
      e.target.value = '';
      return;
    }
    // 异步读取图像尺寸
    createImageBitmap(file).then(bmp => {
      setImageSize({ w: bmp.width, h: bmp.height });
      bmp.close();
    }).catch(() => {
      setImageSize({ w: 0, h: 0 });
    });
    setPendingFile(file);
    setShowDialog(true);
    e.target.value = '';
  };

  /** 用户在对话框点击"转换并上传" */
  const handleConfirm = async (settings: TextureConvertSettings) => {
    if (!pendingFile || !currentProject) return;
    setShowDialog(false);
    setIsConverting(true);
    setProgress({ step: '准备中...', percent: 0 });

    try {
      await textureConverter.convert(
        pendingFile,
        settings,
        currentProject.id,
        (p) => setProgress(p)
      );
      // 刷新资产列表（过滤 isSourceTexture=true 的隐藏资产由 ProjectPanel 自行处理）
      await loadAssets(currentProject.id, 'texture');
    } catch (err) {
      if ((err as Error).message === 'TEXTURE_CONVERT_ABORTED') return;
      setConversionError((err as Error).message ?? '转换失败');
    } finally {
      setIsConverting(false);
      setPendingFile(null);
      setProgress({ step: '', percent: 0 });
    }
  };

  const handleCancel = () => {
    setPendingFile(null);
    setShowDialog(false);
  };

  const handleAbort = () => {
    textureConverter.abort();
    setIsConverting(false);
    setPendingFile(null);
    setProgress({ step: '', percent: 0 });
  };

  return {
    // 状态
    pendingFile,
    showDialog,
    isConverting,
    progress,
    imageSize,
    conversionError,
    // 操作
    trigger,
    handleFileSelected,
    handleConfirm,
    handleCancel,
    handleAbort,
    clearConversionError: () => setConversionError(null),
    // Ref（供 ProjectPanel 渲染 input）
    inputRef,
  };
}
