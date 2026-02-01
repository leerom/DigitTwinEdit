import { useEffect, useRef } from 'react';
import { useSceneStore } from '../../../stores/sceneStore';
import { useProjectStore } from '../../../stores/projectStore';

const AUTO_SAVE_DELAY = 1000; // 1秒防抖

export function useAutoSave() {
  const scene = useSceneStore((state) => state.scene);
  const isDirty = useSceneStore((state) => state.isDirty);
  const markClean = useSceneStore((state) => state.markClean);
  const autoSaveScene = useProjectStore((state) => state.autoSaveScene);
  const currentProject = useProjectStore((state) => state.currentProject);
  const currentSceneId = useProjectStore((state) => state.currentSceneId);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 如果场景有修改且当前有活动场景，设置自动保存
    if (isDirty && currentProject && currentSceneId) {
      timeoutRef.current = setTimeout(async () => {
        try {
          console.log('🔄 Auto-saving scene...');
          await autoSaveScene(scene);
          markClean();
          console.log('✅ Scene auto-saved successfully');
        } catch (error) {
          console.error('❌ Auto-save failed:', error);
        }
      }, AUTO_SAVE_DELAY);
    }

    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [scene, isDirty, currentProject, currentSceneId, autoSaveScene, markClean]);
}
