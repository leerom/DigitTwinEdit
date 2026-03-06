import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { iblConverter } from './IBLConverter';
import type { IBLConvertProgress, IBLConvertSettings } from './types';
import { useAssetStore } from '../../stores/assetStore';
import { useProjectStore } from '../../stores/projectStore';

export function useIBLImport() {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState<IBLConvertProgress>({ step: '', percent: 0 });
  const [conversionError, setConversionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentProject } = useProjectStore();
  const { loadAssets } = useAssetStore();

  const trigger = () => {
    if (!currentProject) {
      alert('请先选择或创建一个项目');
      return;
    }
    inputRef.current?.click();
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      iblConverter.validateFile(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : '文件校验失败');
      event.target.value = '';
      return;
    }

    setPendingFile(file);
    setShowDialog(true);
    event.target.value = '';
  };

  const handleConfirm = async (settings: IBLConvertSettings) => {
    if (!pendingFile || !currentProject) return;

    setShowDialog(false);
    setIsConverting(true);
    setProgress({ step: '准备中...', percent: 0 });

    try {
      await iblConverter.convert(pendingFile, settings, currentProject.id, setProgress);
      await loadAssets(currentProject.id, 'texture');
    } catch (error) {
      if ((error as Error).message !== 'IBL_CONVERT_ABORTED') {
        setConversionError((error as Error).message ?? 'IBL 导入失败');
      }
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
    iblConverter.abort();
    setIsConverting(false);
    setPendingFile(null);
    setProgress({ step: '', percent: 0 });
  };

  return {
    pendingFile,
    showDialog,
    isConverting,
    progress,
    conversionError,
    inputRef,
    trigger,
    handleFileSelected,
    handleConfirm,
    handleCancel,
    handleAbort,
    clearConversionError: () => setConversionError(null),
  };
}
