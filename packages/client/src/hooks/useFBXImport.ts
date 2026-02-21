import { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { fbxImporter } from '../features/fbx/FBXImporter';
import { useProjectStore } from '../stores/projectStore';
import { useAssetStore } from '../stores/assetStore';
import type { FBXImportSettings, ImportProgress } from '../features/fbx/types';

/**
 * FBX 导入流程共享 Hook
 *
 * 封装文件校验、配置对话框、进度跟踪、上传等全部状态与逻辑，
 * 供 Header（菜单触发）和 ProjectPanel（按钮触发）复用。
 *
 * 使用方式：
 *   const fbx = useFBXImport();
 *   // 渲染：
 *   <fbx.FileInput />
 *   <fbx.Dialogs />
 *   // 触发：
 *   <button onClick={fbx.trigger}>导入 FBX</button>
 */
export function useFBXImport() {
  const [fbxFile, setFbxFile] = useState<File | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ step: '', percent: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentProject } = useProjectStore();
  const { loadAssets, assets } = useAssetStore();

  /** 触发文件选择（先检查是否已有项目） */
  const trigger = () => {
    if (!currentProject) {
      alert('请先选择或创建一个项目');
      return;
    }
    inputRef.current?.click();
  };

  /** input[type=file] 的 onChange */
  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      fbxImporter.validateFile(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : '文件校验失败');
      e.target.value = '';
      return;
    }
    setFbxFile(file);
    setShowDialog(true);
    e.target.value = '';
  };

  /** 用户在配置对话框点击「导入」 */
  const handleConfirm = async (settings: FBXImportSettings) => {
    if (!fbxFile || !currentProject) return;
    setShowDialog(false);
    setIsImporting(true);
    try {
      await fbxImporter.import(
        fbxFile,
        settings,
        currentProject.id,
        (progress) => setImportProgress(progress),
        assets.map((a) => a.name)
      );
      await loadAssets(currentProject.id, 'model');
    } catch (err) {
      if (err instanceof Error && err.message === 'FBX_IMPORT_ABORTED') return;
      alert(err instanceof Error ? err.message : '导入失败，请重试');
    } finally {
      setIsImporting(false);
      setFbxFile(null);
      setImportProgress({ step: '', percent: 0 });
    }
  };

  /** 用户在配置对话框点击「取消」 */
  const handleCancel = () => {
    setShowDialog(false);
    setFbxFile(null);
  };

  return {
    /** 触发文件选择 */
    trigger,
    /** 绑定到 <input type="file" /> 的 ref */
    inputRef,
    /** input 的 onChange 处理函数 */
    handleFileSelected,
    /** 以下字段用于渲染 FBXImportDialog */
    fbxFile,
    showDialog,
    handleConfirm,
    handleCancel,
    /** 以下字段用于渲染 ProgressDialog */
    isImporting,
    importProgress,
  };
}
