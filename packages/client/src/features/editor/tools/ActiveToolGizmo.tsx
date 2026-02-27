// src/features/editor/tools/ActiveToolGizmo.tsx
import { useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { useActiveTool } from '../hooks/useEditorState';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { findSubNodeFromGroup } from '@/components/assets/modelHierarchy';
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
 * 根据当前激活的工具渲染对应的 Gizmo。
 * 当 activeSubNodePath 有值时，Gizmo 附加到 GLTF 子节点；否则附加到根 SceneObject group。
 */
export const ActiveToolGizmo: React.FC = () => {
  const activeTool = useActiveTool();
  const { scene } = useThree();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const activeId = useEditorStore((state) => state.activeId);
  const activeSubNodePath = useEditorStore((state) => state.activeSubNodePath);
  const objects = useSceneStore((state) => state.scene.objects);
  const updateTransform = useSceneStore((state) => state.updateTransform);
  const updateComponent = useSceneStore((state) => state.updateComponent);
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

  // 找到顶层 SceneObject 的 Three.js group
  const rootGroup = scene.getObjectByName(primaryObject.id);
  if (!rootGroup) {
    // 对象可能刚被删除/尚未挂载到 three scene
    return null;
  }

  // 决定 Gizmo 附加目标：有子节点路径 → 找子节点；否则用根 group
  let targetObject = rootGroup;
  const isSubNodeMode = !!activeSubNodePath && activeId === primaryObject.id;
  if (isSubNodeMode) {
    const subNode = findSubNodeFromGroup(rootGroup, activeSubNodePath);
    if (subNode) {
      targetObject = subNode;
    }
    // 如果子节点未找到（仍在加载），回退到根 group
  }

  const mode = getControlsMode(activeTool);

  return (
    <TransformControls
      ref={controlsRef}
      object={targetObject}
      mode={mode}
      onChange={() => {
        // Real-time update during drag
        if (!controlsRef.current?.dragging) return;
        const obj = controlsRef.current.object;
        if (!obj) return;

        const pos: [number, number, number] = [obj.position.x, obj.position.y, obj.position.z];
        const rot: [number, number, number] = [obj.rotation.x, obj.rotation.y, obj.rotation.z];
        const sc: [number, number, number] = [obj.scale.x, obj.scale.y, obj.scale.z];

        if (isSubNodeMode && activeId) {
          // 子节点模式：更新 nodeOverrides（不影响 clonedScene 重建）
          const modelComp = (objects[activeId]?.components as any)?.model ?? {};
          const existingOverrides = modelComp.nodeOverrides ?? {};
          updateComponent(activeId, 'model', {
            ...modelComp,
            nodeOverrides: {
              ...existingOverrides,
              [activeSubNodePath]: {
                ...(existingOverrides[activeSubNodePath] ?? {}),
                transform: {
                  position: pos,
                  rotation: rot,
                  scale: sc,
                },
              },
            },
          });
        } else {
          // 根对象模式：保持原有逻辑
          updateTransform(primaryObject.id, {
            position: pos,
            rotation: rot,
            scale: sc,
          });
        }
      }}
    />
  );
};
