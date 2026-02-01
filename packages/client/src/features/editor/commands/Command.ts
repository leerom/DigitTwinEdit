export interface Command {
  name: string;
  execute: () => void;
  undo: () => void;
  merge?: (next: Command) => boolean;
}
