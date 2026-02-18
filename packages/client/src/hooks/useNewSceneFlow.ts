import { useState } from 'react';
import { useSceneStore } from '../stores/sceneStore';
import { useProjectStore } from '../stores/projectStore';
import { useEditorStore } from '../stores/editorStore';
import { getUniqueSceneName } from '../utils/sceneNameUtils';

export interface UseNewSceneFlowReturn {
  showSaveConfirmDialog: boolean;
  showNewSceneDialog: boolean;
  handleNewSceneClick: () => void;
  handleSaveAndProceed: () => Promise<void>;
  handleDiscardAndProceed: () => void;
  handleCancelSave: () => void;
  handleCreateScene: (name: string) => Promise<void>;
  handleCancelCreate: () => void;
}

export function useNewSceneFlow(): UseNewSceneFlowReturn {
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);

  const isDirty = useSceneStore((s) => s.isDirty);
  const scene = useSceneStore((s) => s.scene);
  const markClean = useSceneStore((s) => s.markClean);
  const autoSaveScene = useProjectStore((s) => s.autoSaveScene);
  const scenes = useProjectStore((s) => s.scenes);
  const createScene = useProjectStore((s) => s.createScene);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const handleNewSceneClick = () => {
    if (isDirty) {
      setShowSaveConfirmDialog(true);
    } else {
      setShowNewSceneDialog(true);
    }
  };

  const handleSaveAndProceed = async () => {
    try {
      await autoSaveScene(scene);
      markClean();
      setShowSaveConfirmDialog(false);
      setShowNewSceneDialog(true);
    } catch (error) {
      console.error('保存场景失败:', error);
      alert('保存场景失败，请重试');
    }
  };

  const handleDiscardAndProceed = () => {
    setShowSaveConfirmDialog(false);
    setShowNewSceneDialog(true);
  };

  const handleCancelSave = () => {
    setShowSaveConfirmDialog(false);
  };

  const handleCreateScene = async (name: string) => {
    try {
      const trimmedName = name.trim() || '新建场景';
      const uniqueName = getUniqueSceneName(trimmedName, scenes);
      await createScene(uniqueName);
      clearSelection();
      setShowNewSceneDialog(false);
    } catch (error) {
      console.error('创建场景失败:', error);
      alert('创建场景失败，请重试');
    }
  };

  const handleCancelCreate = () => {
    setShowNewSceneDialog(false);
  };

  return {
    showSaveConfirmDialog,
    showNewSceneDialog,
    handleNewSceneClick,
    handleSaveAndProceed,
    handleDiscardAndProceed,
    handleCancelSave,
    handleCreateScene,
    handleCancelCreate,
  };
}
