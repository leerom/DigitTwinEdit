import { create } from 'zustand';
import { Command } from '@/features/editor/commands/Command';
import { devtools } from 'zustand/middleware';

interface HistoryState {
  past: Command[];
  future: Command[];

  execute: (cmd: Command) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      past: [],
      future: [],

      execute: (cmd) => {
        // Execute immediately
        cmd.execute();

        set((state) => {
           // Check for merge
           const lastCmd = state.past[state.past.length - 1];
           if (lastCmd && lastCmd.merge && lastCmd.merge(cmd)) {
             // Merged (e.g. dragging updates)
             // We keep the old 'undo' but update the 'execute' effect?
             // No, usually merge means we replace the last command with a new one that covers both range.
             // Or we just update the last command.
             // Here we assume merge returns true if it updated itself.
             return { past: [...state.past], future: [] };
           }

           return {
             past: [...state.past, cmd],
             future: []
           };
        });
      },

      undo: () => {
        const { past, future } = get();
        if (past.length === 0) return;

        const cmd = past[past.length - 1];
        cmd.undo();

        set({
          past: past.slice(0, -1),
          future: [cmd, ...future]
        });
      },

      redo: () => {
        const { past, future } = get();
        if (future.length === 0) return;

        const cmd = future[0];
        cmd.execute();

        set({
          past: [...past, cmd],
          future: future.slice(1)
        });
      },

      clear: () => set({ past: [], future: [] }),
    }),
    { name: 'HistoryStore' }
  )
);
