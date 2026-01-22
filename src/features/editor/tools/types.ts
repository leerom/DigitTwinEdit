// src/features/editor/tools/types.ts
import type { ThreeEvent } from '@react-three/fiber';
import type { ToolType, CursorMode } from '../shortcuts/types';
import type { SceneObject } from '@/types';

/**
 * 编辑器工具接口
 */
export interface EditorTool {
  /** 工具名称 */
  name: ToolType;

  /** 快捷键 */
  shortcut: string;

  /** 光标样式 */
  cursor: CursorMode;

  /** 工具激活时调用 */
  onActivate: () => void;

  /** 工具停用时调用 */
  onDeactivate: () => void;

  /** 渲染 Gizmo */
  renderGizmo: (selectedObjects: SceneObject[]) => JSX.Element | null;

  /** 指针按下事件 */
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;

  /** 指针移动事件 */
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;

  /** 指针抬起事件 */
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
}

/**
 * Gizmo 交互状态
 */
export interface GizmoInteraction {
  /** 操作的轴 */
  axis: 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'xyz';

  /** 起始值 */
  startValue: number | [number, number, number];

  /** 当前值 */
  currentValue: number | [number, number, number];

  /** 灵敏度 (Shift 加速时增加) */
  sensitivity: number;
}
