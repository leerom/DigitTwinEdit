import React, { useMemo, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useSceneStore } from '../../stores/sceneStore';
import { useAssetStore } from '../../stores/assetStore';
import { useMaterialStore } from '../../stores/materialStore';
import { ObjectType } from '@/types';
import { TransformProp } from '../inspector/TransformProp';
import { MaterialProp } from '../inspector/MaterialProp';
import { TwinDataProp } from '../inspector/TwinDataProp';
import { CameraProp } from '../inspector/specific/CameraProp';
import { LightProp } from '../inspector/specific/LightProp';
import { MeshProp } from '../inspector/specific/MeshProp';
import { ModelImportProp } from '../inspector/ModelImportProp';
import { TextureImportProp } from '../inspector/TextureImportProp';
import { ModelPreview } from '../inspector/ModelPreview';
import { SubNodeInspector } from '../inspector/SubNodeInspector';
import { MaterialAssetProp } from '../inspector/MaterialAssetProp';
import { MaterialPreview } from '../inspector/MaterialPreview';
import { IBLImportProp } from '../inspector/IBLImportProp';
import { SceneEnvironmentProp } from '../inspector/SceneEnvironmentProp';
import { assetsApi } from '../../api/assets';

function isRuntimeIBLAsset(asset: { type: string; metadata?: unknown } | undefined): boolean {
  if (!asset || (asset.type !== 'texture' && asset.type !== 'image')) return false;
  const metadata = asset.metadata as Record<string, unknown> | undefined;
  return metadata?.usage === 'ibl' && !metadata?.isSourceEnvironment && !metadata?.isEnvironmentPreview;
}

export const InspectorPanel: React.FC = () => {
  const activeId = useEditorStore((state) => state.activeId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const activeSubNodePath = useEditorStore((state) => state.activeSubNodePath);
  const objects = useSceneStore((state) => state.scene.objects);
  const environment = useSceneStore((state) => state.scene.settings.environment);
  const updateObject = useSceneStore((state) => state.updateObject);
  const setDefaultEnvironment = useSceneStore((state) => state.setDefaultEnvironment);
  const setEnvironmentAsset = useSceneStore((state) => state.setEnvironmentAsset);
  const selectedAssetId = useAssetStore((state) => state.selectedAssetId);
  const selectedNodePath = useAssetStore((state) => state.selectedNodePath);
  const assets = useAssetStore((state) => state.assets);

  const selectedAsset = selectedAssetId
    ? assets.find((a) => a.id === selectedAssetId)
    : undefined;
  const environmentAssets = assets.filter((asset) => isRuntimeIBLAsset(asset));
  const activeEnvironmentAsset = environment?.assetId
    ? assets.find((asset) => asset.id === environment.assetId)
    : undefined;
  const isSelectedAssetIBL = isRuntimeIBLAsset(selectedAsset);

  const selectedMaterialId = useMaterialStore((s) => s.selectedMaterialId);
  const materials = useMaterialStore((s) => s.materials);
  const setPreviewSpec = useMaterialStore((s) => s.setPreviewSpec);
  const selectedMaterial = selectedMaterialId
    ? materials.find((m) => m.id === selectedMaterialId)
    : undefined;

  // 离开材质检视模式时清除 previewSpec
  useEffect(() => {
    if (!selectedMaterial) {
      setPreviewSpec(null);
    }
  }, [selectedMaterial, setPreviewSpec]);

  // 纹理缩略图 URL：KTX2 使用源 PNG；普通纹理直接用下载 URL（组件顶层确保 hooks 规则）
  const textureThumbnailUrl = useMemo(() => {
    if (!selectedAsset) return null;
    if (selectedAsset.type !== 'texture' && (selectedAsset.type as string) !== 'image') return null;
    const meta = selectedAsset.metadata as Record<string, unknown> | undefined;
    if (selectedAsset.mime_type === 'image/ktx2') {
      const previewId = meta?.previewAssetId as number | undefined;
      if (previewId) {
        const previewAsset = assets.find((a) => a.id === previewId);
        if (previewAsset) {
          return `${assetsApi.getAssetDownloadUrl(previewId)}?v=${new Date(previewAsset.updated_at).getTime()}`;
        }
      }

      const sourceId = meta?.sourceTextureAssetId as number | undefined;
      if (sourceId) {
        const sourceAsset = assets.find((a) => a.id === sourceId);
        if (sourceAsset) {
          return `${assetsApi.getAssetDownloadUrl(sourceId)}?v=${new Date(sourceAsset.updated_at).getTime()}`;
        }
      }
      return null;
    }
    return `${assetsApi.getAssetDownloadUrl(selectedAsset.id)}?v=${new Date(selectedAsset.updated_at).getTime()}`;
  }, [selectedAsset, assets]);

  if (!activeId) {

    // 材质资产检视模式（优先于 model/texture）
    if (selectedMaterial) {
      return (
        <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
          <div className="panel-title">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-xs">info</span>
              <span>属性检视器 (Inspector)</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* 资产头部 */}
            <div className="p-4 border-b border-border-dark bg-header-dark/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-white/5 shrink-0">
                  <span className="material-symbols-outlined text-primary text-base">texture</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">{selectedMaterial.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {(selectedMaterial.metadata as any)?.materialType ?? 'material'} ·{' '}
                    {(selectedMaterial.file_size / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            </div>
            {/* 属性编辑 */}
            <div className="p-4">
              <MaterialAssetProp
                assetId={selectedMaterial.id}
                projectId={selectedMaterial.project_id}
              />
            </div>
          </div>
          {/* 材质预览，固定在 Inspector 底部 */}
          <div className="shrink-0 border-t border-border-dark px-4 py-3">
            <MaterialPreview />
          </div>
        </div>
      );
    }

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
          <>
            {/* 可滚动内容区：资产头部 + 属性 */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* 资产头部 */}
              <div className="p-4 border-b border-border-dark bg-header-dark/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center border border-white/5 overflow-hidden shrink-0">
                    {textureThumbnailUrl ? (
                      <img
                        src={textureThumbnailUrl}
                        crossOrigin="use-credentials"
                        alt={selectedAsset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-primary text-base">
                        {selectedAsset.type === 'texture' ? 'image' : 'deployed_code'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{selectedAsset.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {selectedAsset.mime_type ?? selectedAsset.type} · {(selectedAsset.file_size / 1024).toFixed(0)} KB
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
                <TextureImportProp
                  asset={selectedAsset}
                  projectId={selectedAsset.project_id}
                  onReimportComplete={() => {}}
                />

                {isSelectedAssetIBL && (
                  <IBLImportProp
                    asset={selectedAsset}
                    projectId={selectedAsset.project_id}
                    onReimportComplete={() => {}}
                  />
                )}
              </div>
            </div>

            {/* 模型 3D 预览，固定在 Inspector 底部 */}
            {selectedAsset.type === 'model' && (
              <div className="shrink-0 border-t border-border-dark px-4 py-3">
                <ModelPreview asset={selectedAsset} nodePath={selectedNodePath} />
              </div>
            )}
          </>
        ) : (
          <SceneEnvironmentProp
            mode={environment?.mode}
            activeEnvironmentName={activeEnvironmentAsset?.name}
            environmentAssets={environmentAssets.map((asset) => ({ id: asset.id, name: asset.name }))}
            onUseDefault={() => setDefaultEnvironment?.()}
            onSelectAsset={(assetId) => setEnvironmentAsset?.(assetId)}
          />
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

  // 子节点选中状态：活跃对象是 MESH 且有 model + activeSubNodePath
  const hasSubNodeSelected = !isMultiSelect
    && !!activeSubNodePath
    && object.type === ObjectType.MESH
    && !!((object.components as any)?.model?.assetId);

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
          {/* Transform Component / SubNodeInspector */}
          {hasSubNodeSelected ? (
            <SubNodeInspector />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold text-slate-300">几何变换 (Transform)</h3>
              </div>
              <TransformProp objectIds={selectedIds} scaleReadOnly={isMainCamera} />
            </div>
          )}

          {/* Object Properties — MESH 和 GROUP */}
          {!isAllCameras && !isAllLights && (
            <div>
              <h3 className="text-[11px] font-bold text-slate-300 mb-3">对象属性 (Object)</h3>
              <MeshProp objectIds={selectedIds} />
            </div>
          )}

          {/* Camera Component */}
          {isAllCameras && (
            <div className="border-t border-white/5 pt-4">
                <CameraProp objectIds={selectedIds} />
            </div>
          )}

          {/* Materials Component - Single Select Only, Not for Camera/Light/SubNode */}
          {!isMultiSelect && !isAllCameras && !isAllLights && !hasSubNodeSelected && (
            <div>
              <h3 className="text-[11px] font-bold text-slate-300 mb-3">材质 (Materials)</h3>
              <MaterialProp objectId={activeId} />
            </div>
          )}

          {/* Light Component */}
          {isAllLights && (
            <LightProp objectIds={selectedIds} />
          )}

          {/* Digital Twin Data - Single Select Only, Not for Camera/Light */}
          {!isMultiSelect && !isAllCameras && !isAllLights && (
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
