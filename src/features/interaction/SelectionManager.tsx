import React from 'react';
import { useEditorStore } from '@/stores/editorStore';

export const SelectionManager: React.FC = () => {
  const clearSelection = useEditorStore((state) => state.clearSelection);

  return (
    <group
      onPointerMissed={(e) => {
        // Clicked on background
        if (e.type === 'click' && !e.ctrlKey && !e.shiftKey) {
           clearSelection();
        }
      }}
    >
      {/* Logic only */}
    </group>
  );
};
