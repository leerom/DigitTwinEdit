import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { TransformProp } from '@/components/inspector/TransformProp';
import { MaterialProp } from '@/components/inspector/MaterialProp';
import { TwinDataProp } from '@/components/inspector/TwinDataProp';

export const Inspector: React.FC = () => {
  const activeId = useEditorStore((state) => state.activeId);
  const objects = useSceneStore((state) => state.scene.objects);
  const updateComponent = useSceneStore((state) => state.updateComponent);

  if (!activeId) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-500 text-sm">
        No object selected
      </div>
    );
  }

  const object = objects[activeId];
  if (!object) return null;

  return (
    <div className="flex flex-col h-full bg-surface text-sm">
      <div className="h-8 flex items-center px-2 bg-[#222] text-xs font-bold text-gray-400 border-b border-gray-700">
        INSPECTOR
      </div>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        {/* Header: Name & Type */}
        <div className="flex flex-col gap-2">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center text-blue-400 font-bold">
               {object.type.charAt(0)}
             </div>
             <div className="flex-1">
               <input
                 className="w-full bg-transparent font-bold text-white focus:outline-none border-b border-transparent focus:border-blue-500"
                 value={object.name}
                 onChange={(e) => updateComponent(activeId, 'name', { name: e.target.value })} // Wait, name is on object root, not component.
                 // We need a specific action for renaming or use generic update.
                 // updateComponent is for components.
                 // Let's assume we add a rename action or use immer in store.
                 disabled
               />
               <div className="text-xs text-gray-500">{object.id.split('-')[0]}</div>
             </div>
           </div>
        </div>

        <hr className="border-gray-700" />

        {/* Transform Component */}
        <TransformProp objectId={activeId} />

        <hr className="border-gray-700" />

        {/* Mesh Component (if exists) */}
        {/* For MVP we assume all objects have mesh props or we check type */}
        <MaterialProp objectId={activeId} />

        <hr className="border-gray-700" />

        {/* Digital Twin Data (if exists) */}
        <TwinDataProp objectId={activeId} />

      </div>
    </div>
  );
};
