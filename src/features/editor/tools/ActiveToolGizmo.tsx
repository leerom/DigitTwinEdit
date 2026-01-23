// src/features/editor/tools/ActiveToolGizmo.tsx
import { useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { useActiveTool } from '../hooks/useEditorState';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import type { ToolType } from '../shortcuts/types';

/**
 * 获取 TransformControls 的模式
 */
const getControlsMode = (tool: ToolType): 'translate' | 'rotate' | 'scale' => {
  switch (tool) {
    case 'translate':
      return 'translate';
    case 'rotate':
      return 'rotate';
    case 'scale':
      return 'scale';
    case 'universal':
      return 'translate'; // 默认显示移动,可以扩展为多模式
    default:
      return 'translate';
  }
};

/**
 * 根据当前激活的工具渲染对应的 Gizmo
 */
export const ActiveToolGizmo: React.FC = () => {
  const activeTool = useActiveTool();
  const { scene } = useThree();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const objects = useSceneStore((state) => state.scene.objects);
  const updateTransform = useSceneStore((state) => state.updateTransform);
  const controlsRef = useRef<any>(null);

  // 获取选中的对象
  const selectedObjects = selectedIds.map((id) => objects[id]).filter(Boolean);

  // 手动工具或没有选中对象时不显示 Gizmo
  if (activeTool === 'hand' || selectedObjects.length === 0) {
    return null;
  }

  // 获取第一个选中对象的引用 (多选时只控制第一个)
  const primaryObject = selectedObjects[0];
  if (!primaryObject) {
    return null;
  }

  const targetObject = scene.getObjectByName(primaryObject.id);
  const mode = getControlsMode(activeTool);

  return (
    <TransformControls
      ref={controlsRef}
      object={targetObject}
      mode={mode}
      onMouseUp={() => {
        // Update transform in store when drag ends
        if (controlsRef.current && controlsRef.current.object) {
          const obj = controlsRef.current.object;
          updateTransform(primaryObject.id, {
            position: [obj.position.x, obj.position.y, obj.position.z],
            rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
            scale: [obj.scale.x, obj.scale.y, obj.scale.z],
          });
        }
      }}
    />
  );
};
