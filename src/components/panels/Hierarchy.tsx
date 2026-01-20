import React from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useEditorStore } from '@/stores/editorStore';
import { ChevronRight, ChevronDown, Box, Folder, Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import { SceneObject, ObjectType } from '@/types';

interface HierarchyItemProps {
  id: string;
  depth: number;
}

const HierarchyItem: React.FC<HierarchyItemProps> = React.memo(({ id, depth }) => {
  const object = useSceneStore((state) => state.scene.objects[id]);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const select = useEditorStore((state) => state.select);
  const activeId = useEditorStore((state) => state.activeId);

  // Local expansion state (could be moved to store if we want persistence)
  const [expanded, setExpanded] = React.useState(true);

  if (!object) return null;

  const isSelected = selectedIds.includes(id);
  const isActive = activeId === id;
  const hasChildren = object.children.length > 0;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isMulti = e.ctrlKey || e.metaKey;
    select([id], isMulti);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div>
      <div
        className={clsx(
          "flex items-center h-7 px-2 text-sm cursor-pointer select-none hover:bg-[#333]",
          isSelected ? "bg-primary/30 text-white" : "text-gray-300",
          isActive && "bg-primary/50"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleSelect}
      >
        <button
          className="p-0.5 hover:text-white mr-1 w-4"
          onClick={toggleExpand}
        >
          {hasChildren && (
            expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          )}
        </button>

        <span className="mr-2 text-gray-500">
          {object.type === ObjectType.GROUP ? <Folder size={14} /> : <Box size={14} />}
        </span>

        <span className="truncate flex-1">{object.name}</span>

        {/* Helper icons on hover? */}
      </div>

      {expanded && object.children.map((childId) => (
        <HierarchyItem key={childId} id={childId} depth={depth + 1} />
      ))}
    </div>
  );
});

export const Hierarchy: React.FC = () => {
  const rootId = useSceneStore((state) => state.scene.root);
  const root = useSceneStore((state) => state.scene.objects[rootId]);

  if (!root) return <div className="p-4 text-red-500">Error: Root not found</div>;

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="h-8 flex items-center px-2 bg-[#222] text-xs font-bold text-gray-400 border-b border-gray-700">
        HIERARCHY
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {/* Render Root's Children directly to hide Root group?
            Or render Root? Unity usually hides "Scene" root but shows top-level objects.
            Our data model has a Root Group. Let's show it or just its children.
        */}
        <HierarchyItem id={rootId} depth={0} />
      </div>
    </div>
  );
};
