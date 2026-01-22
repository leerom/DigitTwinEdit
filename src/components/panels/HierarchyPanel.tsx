import React from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useEditorStore } from '../../stores/editorStore';
import { ObjectType } from '../../types';
import { clsx } from 'clsx';
import { Lock } from 'lucide-react';

interface HierarchyItemProps {
  id: string;
  depth: number;
}

const HierarchyItem: React.FC<HierarchyItemProps> = React.memo(({ id, depth }) => {
  const object = useSceneStore((state) => state.scene.objects[id]);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const select = useEditorStore((state) => state.select);

  const [expanded, setExpanded] = React.useState(true);

  if (!object) return null;

  const isSelected = selectedIds.includes(id);
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
          <Lock className="w-3 h-3 mr-1 text-yellow-500" title="此对象已锁定" />
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
  const rootId = useSceneStore((state) => state.scene.root);

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
          <span>SampleScene</span>
        </div>

        {/* Scene Objects */}
        <div className="pl-4">
          {/* Main Camera */}
          <div className="hierarchy-item">
            <span className="material-symbols-outlined text-xs mr-2 text-slate-500">videocam</span>
            <span>Main Camera</span>
          </div>

          {/* Directional Light */}
          <div className="hierarchy-item">
            <span className="material-symbols-outlined text-xs mr-2 text-yellow-400">light_mode</span>
            <span>Directional Light</span>
          </div>

          {/* Dynamic objects from store */}
          <HierarchyItem id={rootId} depth={0} />

          {/* Additional static items to match sample */}
          <div className="hierarchy-item">
            <span className="material-symbols-outlined text-xs mr-2 text-slate-500">grid_view</span>
            <span>Ground_Plane</span>
          </div>
          <div className="hierarchy-item">
            <span className="material-symbols-outlined text-xs mr-2 text-slate-500">precision_manufacturing</span>
            <span>HVAC_System_Group</span>
          </div>
        </div>
      </div>
    </div>
  );
};
