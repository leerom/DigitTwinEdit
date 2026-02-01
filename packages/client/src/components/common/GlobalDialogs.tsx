import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useHistoryStore } from '@/stores/historyStore';
import { ConfirmDialog } from '@/features/scene/components/ConfirmDialog';
import { DeleteObjectsCommand } from '@/features/editor/commands/DeleteObjectsCommand';

export const GlobalDialogs: React.FC = () => {
  const showDeleteConfirmation = useEditorStore((state) => state.showDeleteConfirmation);
  const setDeleteConfirmation = useEditorStore((state) => state.setDeleteConfirmation);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const executeCommand = useHistoryStore((state) => state.execute);

  const handleDeleteConfirm = () => {
    if (selectedIds.length > 0) {
      executeCommand(new DeleteObjectsCommand(selectedIds));
    }
    setDeleteConfirmation(false);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation(false);
  };

  return (
    <>
      <ConfirmDialog
        isOpen={showDeleteConfirmation}
        onClose={handleDeleteCancel}
        title="删除对象"
        message={`确定要删除选中的 ${selectedIds.length} 个对象吗？此操作将同时删除其所有子对象。`}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="删除"
        cancelText="取消"
      />
    </>
  );
};
