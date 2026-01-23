import React from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useEditorStore } from '../../stores/editorStore';
import { ObjectType } from '../../types';
import { clsx } from 'clsx';

interface HierarchyItemProps {
  id: string;
  depth: number;
}

const HierarchyItem: React.FC<HierarchyItemProps> = React.memo(({ id, depth }) => {
  const object = useSceneStore((state) => state.scene.objects[id]);
  const isSelected = useEditorStore((state) => state.selectedIds.includes(id));
  const select = useEditorStore((state) => state.select);

  const [expanded, setExpanded] = React.useState(true);

  if (!object) return null;
  const hasChildren = object.children.length > 0;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Single selection only as per requirement
    // const isMulti = e.ctrlKey || e.metaKey;
    select([id], false);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  // Get icon based on object type
  const getIcon = () => {
    switch (object.type) {
      case ObjectType.CAMERA:
        return { icon: 'videocam', color: 'text-slate-500' };
      case ObjectType.LIGHT:
        return { icon: 'light_mode', color: 'text-yellow-400' };
      case ObjectType.GROUP:
        return { icon: 'grid_view', color: 'text-slate-500' };
      default:
        return { icon: 'view_in_ar', color: isSelected ? 'text-primary' : 'text-slate-500' };
    }
  };

  const iconInfo = getIcon();

  return (
    <div>
      <div
        className={clsx(
          "hierarchy-item",
          isSelected && "bg-primary/20 text-white border-l-2 border-primary"
        )}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            className="w-4 h-4 flex items-center justify-center text-slate-500 hover:text-white transition-colors mr-1"
            onClick={toggleExpand}
          >
            <span className="material-symbols-outlined text-xs">
              {expanded ? 'expand_more' : 'chevron_right'}
            </span>
          </button>
        ) : (
          <span className="w-4 h-4 mr-1"></span>
        )}

        {/* Icon */}
        <span className={clsx("mr-2 material-symbols-outlined text-xs", iconInfo.color)}>
          {iconInfo.icon}
        </span>

        {/* Lock Icon */}
        {object.locked && (
          <span className="material-symbols-outlined text-xs text-yellow-500 mr-1" title="此对象已锁定">lock</span>
        )}

        {/* Name */}
        <span className={clsx("truncate flex-1", object.locked && "text-slate-400")}>
          {object.name}
        </span>
      </div>

      {expanded && object.children.map((childId) => (
        <HierarchyItem key={childId} id={childId} depth={depth + 1} />
      ))}
    </div>
  );
});

export const HierarchyPanel: React.FC = () => {
  const sceneName = useSceneStore((state) => state.scene.name);
  const rootId = useSceneStore((state) => state.scene.root);
  const rootObject = useSceneStore((state) => state.scene.objects[rootId]);

  return (
    <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
      {/* Panel Header */}
      <div className="panel-title">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-xs">account_tree</span>
          <span>层级视图 (Hierarchy)</span>
        </div>
        <button className="material-symbols-outlined text-xs hover:text-white transition-colors">add</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-1">
        {/* Scene Root Header */}
        <div className="hierarchy-item text-slate-400 font-semibold mb-1">
          <span className="material-symbols-outlined text-xs mr-1">expand_more</span>
          <span className="material-symbols-outlined text-xs mr-2 text-blue-400">deployed_code</span>
          <span>{sceneName}</span>
        </div>

        {/* Scene Objects */}
        <div className="pl-4">
          {rootObject && rootObject.children.map((childId) => (
            <HierarchyItem key={childId} id={childId} depth={0} />
          ))}
        </div>
      </div>
    </div>
  );
};
