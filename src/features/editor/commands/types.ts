// src/features/editor/commands/types.ts

/**
 * 命令接口 - 支持撤销/重做
 */
export interface Command {
  /** 命令名称 */
  name: string;

  /** 执行命令 */
  execute: () => void;

  /** 撤销命令 */
  undo: () => void;

  /** 合并命令 (可选) - 用于合并连续的相同类型命令 */
  merge?: (other: Command) => boolean;
}

/**
 * 命令历史状态
 */
export interface CommandHistoryState {
  /** 撤销栈 */
  undoStack: Command[];

  /** 重做栈 */
  redoStack: Command[];

  /** 最大历史记录数 */
  maxHistory: number;
}
