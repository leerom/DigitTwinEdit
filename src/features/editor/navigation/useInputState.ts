import { create } from 'zustand';

interface InputState {
  keys: Record<string, boolean>;
  setKey: (code: string, pressed: boolean) => void;
}

/**
 * 高频输入状态管理器
 * 用于在 useFrame 循环中读取键盘状态，避免 React 重渲染
 */
export const useInputState = create<InputState>((set) => ({
  keys: {},
  setKey: (code, pressed) =>
    set((state) => {
      // 只有在状态真正改变时才更新，虽然 Zustand 会自动处理，但显式检查更好
      if (state.keys[code] === pressed) {
        return state;
      }
      return {
        keys: { ...state.keys, [code]: pressed },
      };
    }),
}));
