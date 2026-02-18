import React from 'react';
import { clsx } from 'clsx';
import { Dialog } from '../../../components/common/Dialog';
import { useProjectStore } from '../../../stores/projectStore';

interface OpenSceneDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenSceneDialog: React.FC<OpenSceneDialogProps> = ({ isOpen, onClose }) => {
  const { scenes, currentSceneId, switchScene } = useProjectStore();

  const handleSelect = async (sceneId: number) => {
    onClose();
    if (sceneId === currentSceneId) return;
    try {
      await switchScene(sceneId);
    } catch (error) {
      console.error('Failed to open scene:', error);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="打开场景" className="max-w-[400px]">
      <div className="flex flex-col gap-2">
        {scenes.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-slate-500 text-sm">
            暂无场景
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => handleSelect(scene.id)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded text-sm text-left w-full transition-colors',
                  scene.id === currentSceneId
                    ? 'bg-primary/20 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                )}
              >
                <span className="material-symbols-outlined text-base text-slate-400 shrink-0">
                  photo_library
                </span>
                <span className="flex-1 truncate">{scene.name}</span>
                {scene.is_active && (
                  <span className="text-[10px] text-primary shrink-0">活动</span>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-2 pt-2 border-t border-border-default">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </Dialog>
  );
};
