import { useEditorStore } from '@/stores/editorStore';

/**
 * 获取当前激活的工具
 */
export const useActiveTool = () => {
  return useEditorStore((state) => state.activeTool);
};

/**
 * 获取工具切换函数
 */
export const useSetActiveTool = () => {
  return useEditorStore((state) => state.setActiveTool);
};

/**
 * 获取修饰键状态
 */
export const useModifiers = () => {
  return useEditorStore((state) => state.modifiers);
};

/**
 * 获取光标模式
 */
export const useCursorMode = () => {
  return useEditorStore((state) => state.cursorMode);
};

/**
 * 获取导航模式
 */
export const useNavigationMode = () => {
  return useEditorStore((state) => state.navigationMode);
};

/**
 * 获取视图模式
 */
export const useViewMode = () => {
  return useEditorStore((state) => state.viewMode);
};
