// src/features/editor/shortcuts/KeyboardShortcutManager.tsx
import { useEffect } from 'react';
import { useActiveTool, useViewMode } from '../hooks/useEditorState';
import { useEditorStore } from '@/stores/editorStore';
import { buildShortcutKey } from '@/utils/platform';
import { defaultShortcuts } from './shortcutRegistry';
import { executeShortcut } from './executeShortcut';

/**
 * 全局键盘快捷键管理器
 * 监听键盘事件并根据上下文执行对应的快捷键动作
 */
export const KeyboardShortcutManager: React.FC = () => {
  const activeTool = useActiveTool();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const viewMode = useViewMode();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 输入框聚焦时跳过
      const target = document.activeElement;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        (target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      // 构建快捷键字符串
      const key = buildShortcutKey(e);
      const shortcut = defaultShortcuts[key];

      if (!shortcut) return;

      // 上下文检查
      if (shortcut.requiresSelection && selectedIds.length === 0) {
        return;
      }

      if (shortcut.disabledIn2D && viewMode === '2D') {
        return;
      }

      // 阻止默认行为
      e.preventDefault();

      // 执行快捷键动作
      executeShortcut(shortcut);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTool, selectedIds, viewMode]);

  // 这是一个无渲染组件
  return null;
};
