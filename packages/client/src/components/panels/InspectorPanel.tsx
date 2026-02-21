import React from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useSceneStore } from '../../stores/sceneStore';
import { useAssetStore } from '../../stores/assetStore';
import { ObjectType } from '@/types';
import { TransformProp } from '../inspector/TransformProp';
import { MaterialProp } from '../inspector/MaterialProp';
import { TwinDataProp } from '../inspector/TwinDataProp';
import { CameraProp } from '../inspector/specific/CameraProp';
import { LightProp } from '../inspector/specific/LightProp';
import { ModelImportProp } from '../inspector/ModelImportProp';

export const InspectorPanel: React.FC = () => {
  const activeId = useEditorStore((state) => state.activeId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const objects = useSceneStore((state) => state.scene.objects);
  const updateComponent = useSceneStore((state) => state.updateComponent);
  const updateObject = useSceneStore((state) => state.updateObject);
  const selectedAssetId = useAssetStore((state) => state.selectedAssetId);
  const assets = useAssetStore((state) => state.assets);

  if (!activeId) {
    const selectedAsset = selectedAssetId
      ? assets.find((a) => a.id === selectedAssetId)
      : undefined;

    return (
      <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
        {/* Panel Header */}
        <div className="panel-title">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-xs">info</span>
            <span>属性检视器 (Inspector)</span>
          </div>
          <button className="material-symbols-outlined text-xs hover:text-white transition-colors">settings</button>
        </div>

        {selectedAsset ? (
          /* 资产检视模式 */
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* 资产头部 */}
            <div className="p-4 border-b border-border-dark bg-header-dark/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-white/5">
                  <span className="material-symbols-outlined text-primary text-base">deployed_code</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{selectedAsset.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {selectedAsset.type} · {(selectedAsset.file_size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            </div>

            {/* 资产属性内容 */}
            <div className="p-4">
              <ModelImportProp
                asset={selectedAsset}
                projectId={selectedAsset.project_id}
                onReimportComplete={() => {}}
              />
            </div>
          </div>
        ) : (
          /* 无选中状态 */
          <div className="flex flex-col flex-1 items-center justify-center text-slate-500 text-sm italic">
            No object selected
          </div>
        )}
      </div>
    );
  }

  const object = objects[activeId];
  if (!object) return null;

  const isMultiSelect = selectedIds.length > 1;
  const isAllCameras = selectedIds.every(id => objects[id]?.type === ObjectType.CAMERA);
  const isAllLights = selectedIds.every(id => objects[id]?.type === ObjectType.LIGHT);

  // Check if selected object is main camera
  const isMainCamera = !!(activeId && objects[activeId]?.type === ObjectType.CAMERA && objects[activeId]?.name === 'Main Camera');

  return (
    <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
      {/* Panel Header */}
      <div className="panel-title">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-xs">info</span>
          <span>属性检视器 (Inspector)</span>
        </div>
        <button className="material-symbols-outlined text-xs hover:text-white transition-colors">settings</button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Object Header */}
        <div className="p-4 border-b border-border-dark bg-header-dark/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-white/5">
              <span className="material-symbols-outlined text-primary">
                {isMultiSelect ? 'select_all' : 'view_in_ar'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#999999] font-medium mr-2 whitespace-nowrap">名称</span>
                <input
                  className="bg-[#0c0e14] border-none text-sm text-white focus:ring-1 focus:ring-primary/50 p-1 w-full focus:outline-none rounded-sm"
                  type="text"
                  value={isMultiSelect ? `${selectedIds.length} Objects Selected` : object.name}
                  onChange={(e) => updateObject(activeId, { name: e.target.value })}
                  disabled={isMultiSelect}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Components */}
        <div className="p-4 space-y-6">
          {/* Transform Component */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-slate-300">几何变换 (Transform)</h3>
            </div>
            <div className="space-y-4">
              <TransformProp objectIds={selectedIds} scaleReadOnly={isMainCamera} />
            </div>
          </div>

          {/* Camera Component */}
          {isAllCameras && (
            <div className="border-t border-white/5 pt-4">
                <CameraProp objectIds={selectedIds} />
            </div>
          )}

          {/* Materials Component - Single Select Only, Not for Camera/Light */}
          {!isMultiSelect && !isAllCameras && !isAllLights && (
            <div>
              <h3 className="text-[11px] font-bold text-slate-300 mb-3">材质 (Materials)</h3>
              <MaterialProp objectId={activeId} />
            </div>
          )}

          {/* Light Component */}
          {isAllLights && (
            <LightProp objectIds={selectedIds} />
          )}

          {/* Digital Twin Data - Single Select Only, Not for Camera */}
          {!isMultiSelect && !isAllCameras && (
            <div className="p-3 bg-primary/5 rounded border border-primary/20">
              <div className="flex items-center text-primary mb-2">
                <span className="material-symbols-outlined text-xs mr-2">database</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">数字孪生数据</span>
              </div>
              <TwinDataProp objectId={activeId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
