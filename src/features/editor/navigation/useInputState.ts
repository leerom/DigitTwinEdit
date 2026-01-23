import { create } from 'zustand';

interface InputState {
  keys: Record<string, boolean>;
  setKey: (code: string, pressed: boolean) => void;
  resetKeys: () => void;
}

/**
 * High-frequency input state manager
 * Used to read keyboard state in useFrame loops, avoiding React re-renders
 */
export const useInputState = create<InputState>((set) => ({
  keys: {},
  setKey: (code, pressed) =>
    set((state) => {
      // Only update if state actually changed
      if (state.keys[code] === pressed) {
        return state;
      }
      return {
        keys: { ...state.keys, [code]: pressed },
      };
    }),
  resetKeys: () => set({ keys: {} }),
}));
