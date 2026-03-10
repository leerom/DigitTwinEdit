import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { useAssetStore } from '../../stores/assetStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useSceneStore } from '../../stores/sceneStore.js';
import { useEditorStore } from '../../stores/editorStore.js';
import { AssetCard } from '../assets/AssetCard.js';
import { ModelHierarchyExpander } from '../assets/ModelHierarchyExpander.js';
import { SceneCard } from './SceneCard.js';
import { UploadProgressList } from '../assets/UploadProgress.js';
import { ContextMenu, type ContextMenuItem } from '../common/ContextMenu.js';
import { Dialog } from '../common/Dialog.js';
import { InputDialog } from '../common/InputDialog.js';
import { useNewSceneFlow } from '../../hooks/useNewSceneFlow.js';
import { useFBXImport } from '../../hooks/useFBXImport.js';
import { FBXImportDialog } from '../../features/fbx/FBXImportDialog.js';
import { ProgressDialog } from '../../features/scene/components/ProgressDialog.js';
import { fbxImporter } from '../../features/fbx/FBXImporter.js';
import { useTextureImport } from '../../features/textures/useTextureImport.js';
import { TextureImportDialog } from '../../features/textures/TextureImportDialog.js';
import { useIBLImport } from '../../features/ibl/useIBLImport.js';
import { IBLImportDialog } from '../../features/ibl/IBLImportDialog.js';
import { useMaterialStore } from '../../stores/materialStore.js';
import type { AssetType } from '@digittwinedit/shared';
import type { MaterialType } from '../../types/index.js';

type FolderType = 'scenes' | 'models' | 'materials' | 'textures' | 'environments';

export const ProjectPanel: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'project' | 'resources'>('project');
  const [selectedFolder, setSelectedFolder] = useState<FolderType>('scenes');

  const { currentProject, scenes, switchScene, updateSceneMetadata, deleteScene } = useProjectStore();
  const {
    assets,
    isLoading,
    uploadProgress,
    selectedAssetId,
    loadAssets,
    deleteAsset,
    updateAsset,
    selectAsset,
  } = useAssetStore();
  const { addAssetToScene, scene, setDefaultEnvironment } = useSceneStore();
  const clearSelection = useEditorStore((state) => state.clearSelection);

  const {
    materials,
    isLoading: isMaterialsLoading,
    selectedMaterialId,
    loadMaterials,
    createMaterial,
    duplicateMaterial,
    renameMaterial,
    deleteMaterial: deleteMaterialAsset,
    selectMaterial,
  } = useMaterialStore();

  const {
    showSaveConfirmDialog,
    showNewSceneDialog,
    handleNewSceneClick,
    handleSaveAndProceed,
    handleDiscardAndProceed,
    handleCancelSave,
    handleCreateScene,
    handleCancelCreate,
  } = useNewSceneFlow();

  // FBX 导入 Hook（Models 文件夹专用）
  const fbx = useFBXImport();

  // 纹理导入 Hook（Textures 文件夹专用）
  const tex = useTextureImport();

  // IBL 导入 Hook（Environments 文件夹专用）
  const ibl = useIBLImport();

  const [blankContextMenu, setBlankContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showNewMaterialDialog, setShowNewMaterialDialog] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('新建材质');
  const [newMaterialType, setNewMaterialType] = useState<MaterialType>('MeshStandardMaterial');
  const [newMaterialError, setNewMaterialError] = useState<string | null>(null);
  const [materialContextMenu, setMaterialContextMenu] = useState<{
    x: number; y: number; assetId: number; assetName: string;
  } | null>(null);
  const [renameMaterialDialog, setRenameMaterialDialog] = useState<{ id: number; name: string } | null>(null);

  // 加载资产
  useEffect(() => {
    if (!currentProject || activeTab !== 'project' || selectedFolder === 'scenes') return;
    if (selectedFolder === 'materials') {
      loadMaterials(currentProject.id);
    } else {
      const assetType: AssetType = selectedFolder === 'models' ? 'model' : 'texture';
      loadAssets(currentProject.id, assetType);
    }
  }, [currentProject, selectedFolder, activeTab, loadAssets, loadMaterials]);

  // 场景操作处理函数
  const handleSceneOpen = async (sceneId: number) => {
    if (!currentProject) return;
    try {
      await switchScene(sceneId);
    } catch (error) {
      console.error('Failed to switch scene:', error);
      alert('切换场景失败，请重试');
    }
  };

  const handleSceneRename = async (sceneId: number, newName: string) => {
    if (!newName.trim()) {
      alert('名称不能为空');
      return;
    }
    if (newName.length > 255) {
      alert('名称过长（最多255字符）');
      return;
    }
    try {
      await updateSceneMetadata(sceneId, { name: newName });
    } catch (error) {
      console.error('Failed to rename scene:', error);
      alert('重命名失败，请重试');
    }
  };

  const handleSceneDelete = async (sceneId: number) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene?.is_active) {
      alert('无法删除活动场景，请先切换到其他场景');
      return;
    }
    if (!confirm('确定要删除这个场景吗？')) return;

    try {
      await deleteScene(sceneId);
    } catch (error) {
      console.error('Failed to delete scene:', error);
      alert('删除场景失败，请重试');
    }
  };

  // 资产操作处理函数
  const handleAssetOpen = async (assetId: number) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;

    try {
      addAssetToScene(asset);
    } catch (error) {
      console.error('Failed to add asset to scene:', error);
      alert('添加资产到场景失败，请重试');
    }
  };

  const handleAssetRename = async (assetId: number, newName: string) => {
    if (!newName.trim()) {
      alert('名称不能为空');
      return;
    }
    if (newName.length > 255) {
      alert('名称过长（最多255字符）');
      return;
    }
    if (/[<>:"/\\|?*]/.test(newName)) {
      alert('名称包含非法字符');
      return;
    }
    try {
      await updateAsset(assetId, { name: newName });
    } catch (error) {
      console.error('Failed to rename asset:', error);
      alert('重命名失败，请重试');
    }
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (confirm('确定要删除这个资产吗？')) {
      try {
        await deleteAsset(assetId);
        if (scene.settings.environment.mode === 'asset' && scene.settings.environment.assetId === assetId) {
          setDefaultEnvironment();
        }
        if (selectedAssetId === assetId) {
          selectAsset(null);
        }
      } catch (error) {
        console.error('Failed to delete asset:', error);
      }
    }
  };

  const handleAssetDragStart = (e: React.DragEvent, assetId: number) => {
    const asset = assets.find((a) => a.id === assetId);
    e.dataTransfer.setData('assetId', assetId.toString());
    e.dataTransfer.setData('assetType', asset?.type ?? '');
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleMaterialDragStart = (e: React.DragEvent, assetId: number) => {
    e.dataTransfer.setData('assetId', assetId.toString());
    e.dataTransfer.setData('assetType', 'material');
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleNewMaterialConfirm = async () => {
    if (!currentProject) return;
    if (!newMaterialName.trim()) {
      setNewMaterialError('名称不能为空');
      return;
    }
    try {
      setNewMaterialError(null);
      await createMaterial(currentProject.id, newMaterialName.trim(), newMaterialType);
      setShowNewMaterialDialog(false);
      setNewMaterialName('新建材质');
      setNewMaterialType('MeshStandardMaterial');
    } catch {
      setNewMaterialError('创建失败，请重试');
    }
  };

  const handleDuplicateMaterial = async (assetId: number) => {
    if (!currentProject) return;
    try {
      await duplicateMaterial(assetId, currentProject.id);
    } catch (error) {
      console.error('Failed to duplicate material:', error);
    }
  };

  const handleRenameMaterial = async (assetId: number, newName: string) => {
    if (!newName.trim()) { alert('名称不能为空'); return; }
    if (newName.length > 255) { alert('名称过长（最多255字符）'); return; }
    try {
      await renameMaterial(assetId, newName.trim());
    } catch {
      alert('重命名失败，请重试');
    }
  };

  const handleDeleteMaterial = async (assetId: number) => {
    const refCount = Object.values(useSceneStore.getState().scene.objects)
      .filter((obj: any) => obj.components?.mesh?.materialAssetId === assetId).length;
    const confirmMsg = refCount > 0
      ? `该材质被场景中 ${refCount} 个对象使用，删除后这些对象的材质将同时被清除。\n\n确认删除？`
      : '确定要删除这个材质资产吗？';
    if (!confirm(confirmMsg)) return;
    try {
      await deleteMaterialAsset(assetId);
    } catch (error) {
      console.error('Failed to delete material:', error);
    }
  };

  const blankAreaMenuItems: ContextMenuItem[] = selectedFolder === 'materials' ? [
    {
      label: '新建材质',
      icon: 'add',
      onClick: () => {
        setBlankContextMenu(null);
        setShowNewMaterialDialog(true);
      },
    },
  ] : [
    {
      label: '新建',
      icon: 'add',
      onClick: handleNewSceneClick,
    },
    {
      label: '打开',
      icon: 'play_arrow',
      onClick: () => {},
      disabled: true,
    },
    {
      label: '重命名',
      icon: 'edit',
      onClick: () => {},
      disabled: true,
    },
    {
      label: '删除',
      icon: 'delete',
      onClick: () => {},
      danger: true,
      disabled: true,
    },
  ];

  const isRuntimeIBLAsset = (asset: (typeof assets)[number]) => {
    const meta = asset.metadata as Record<string, unknown> | undefined;
    return meta?.usage === 'ibl' && !meta?.isSourceEnvironment && !meta?.isEnvironmentPreview;
  };

  // 过滤掉原始 FBX 文件和原始纹理文件（只显示转换后的 GLB 和 KTX2 资产）
  const displayAssets = assets.filter((asset) => {
    const meta = asset.metadata as Record<string, unknown> | undefined;
    return !meta?.isSourceFbx && !meta?.isSourceTexture;
  });

  const visibleAssets = displayAssets.filter((asset) => {
    const meta = asset.metadata as Record<string, unknown> | undefined;

    if (selectedFolder === 'models') {
      return asset.type === 'model';
    }
    if (selectedFolder === 'textures') {
      return (asset.type === 'texture' || (asset.type as string) === 'image') && meta?.usage !== 'ibl';
    }
    if (selectedFolder === 'environments') {
      return isRuntimeIBLAsset(asset);
    }
    return false;
  });

  return (
    <div className="flex flex-col h-full w-full bg-panel-dark flex-shrink-0">
      {/* Panel Header with Tabs */}
      <div className="panel-title">
        <div className="flex items-center space-x-6">
          {/* Project Tab */}
          <button
            onClick={() => setActiveTab('project')}
            className={clsx(
              "flex items-center space-x-2 pb-1 -mb-2 cursor-pointer transition-colors",
              activeTab === 'project'
                ? "text-white border-b-2 border-primary"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <span className="material-symbols-outlined text-xs">folder</span>
            <span>项目</span>
          </button>

          {/* Resources Tab */}
          <button
            onClick={() => setActiveTab('resources')}
            className={clsx(
              "flex items-center space-x-2 pb-1 -mb-2 cursor-pointer transition-colors",
              activeTab === 'resources'
                ? "text-white border-b-2 border-primary"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <span className="material-symbols-outlined text-xs">category</span>
            <span>资产库</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'project' ? (
          <>
            {/* Left Sidebar: Folder Tree */}
            <aside className="w-64 border-r border-border-dark overflow-y-auto custom-scrollbar p-2">
              <div className="space-y-1">
                {/* Assets Root */}
                <div className="flex items-center space-x-2 text-xs text-slate-400 px-2 py-1 rounded">
                  <span className="material-symbols-outlined text-xs">expand_more</span>
                  <span className="material-symbols-outlined text-xs text-amber-500">folder_open</span>
                  <span>Assets</span>
                </div>

                {/* Subfolders */}
                <div className="pl-4 space-y-1">
                  <div
                    className={clsx(
                      "flex items-center space-x-2 text-xs cursor-pointer px-2 py-1 rounded",
                      selectedFolder === 'scenes'
                        ? "text-slate-300 bg-primary/10"
                        : "text-slate-500 hover:text-white hover:bg-slate-800"
                    )}
                    onClick={() => setSelectedFolder('scenes')}
                  >
                    <span className="material-symbols-outlined text-xs">photo_library</span>
                    <span>Scenes</span>
                  </div>

                  <div
                    className={clsx(
                      "flex items-center space-x-2 text-xs cursor-pointer px-2 py-1 rounded",
                      selectedFolder === 'models'
                        ? "text-slate-300 bg-primary/10"
                        : "text-slate-500 hover:text-white hover:bg-slate-800"
                    )}
                    onClick={() => setSelectedFolder('models')}
                  >
                    <span className="material-symbols-outlined text-xs">deployed_code</span>
                    <span>Models</span>
                  </div>

                  <div
                    className={clsx(
                      "flex items-center space-x-2 text-xs cursor-pointer px-2 py-1 rounded",
                      selectedFolder === 'materials'
                        ? "text-slate-300 bg-primary/10"
                        : "text-slate-500 hover:text-white hover:bg-slate-800"
                    )}
                    onClick={() => setSelectedFolder('materials')}
                  >
                    <span className="material-symbols-outlined text-xs">texture</span>
                    <span>Materials</span>
                  </div>

                  <div
                    className={clsx(
                      "flex items-center space-x-2 text-xs cursor-pointer px-2 py-1 rounded",
                      selectedFolder === 'textures'
                        ? "text-slate-300 bg-primary/10"
                        : "text-slate-500 hover:text-white hover:bg-slate-800"
                    )}
                    onClick={() => setSelectedFolder('textures')}
                  >
                    <span className="material-symbols-outlined text-xs">image</span>
                    <span>Textures</span>
                  </div>

                  <div
                    className={clsx(
                      "flex items-center space-x-2 text-xs cursor-pointer px-2 py-1 rounded",
                      selectedFolder === 'environments'
                        ? "text-slate-300 bg-primary/10"
                        : "text-slate-500 hover:text-white hover:bg-slate-800"
                    )}
                    onClick={() => setSelectedFolder('environments')}
                  >
                    <span className="material-symbols-outlined text-xs">hdr_strong</span>
                    <span>Environments</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content: Asset Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between p-2 border-b border-border-dark">
                <div className="text-xs text-slate-400">
                  {selectedFolder === 'scenes'
                    ? `${scenes.length} 个场景`
                    : selectedFolder === 'materials'
                    ? `${materials.length} 个资产`
                    : `${visibleAssets.length} 个资产`}
                </div>

                {selectedFolder === 'models' && (
                  <button
                    onClick={fbx.trigger}
                    className="flex items-center space-x-1 px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs rounded transition-colors"
                    disabled={!currentProject}
                  >
                    <span className="material-symbols-outlined text-sm">upload</span>
                    <span>导入 FBX</span>
                  </button>
                )}

                {selectedFolder === 'textures' && (
                  <button
                    onClick={tex.trigger}
                    className="flex items-center space-x-1 px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs rounded transition-colors"
                    disabled={!currentProject}
                  >
                    <span className="material-symbols-outlined text-sm">upload</span>
                    <span>导入纹理（→KTX2）</span>
                  </button>
                )}

                {selectedFolder === 'environments' && (
                  <button
                    aria-label="导入 HDR/EXR"
                    onClick={ibl.trigger}
                    className="flex items-center space-x-1 px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs rounded transition-colors"
                    disabled={!currentProject}
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-sm">upload</span>
                    <span>导入 HDR/EXR</span>
                  </button>
                )}

                {selectedFolder === 'materials' && (
                  <button
                    onClick={() => setShowNewMaterialDialog(true)}
                    className="flex items-center space-x-1 px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs rounded transition-colors"
                    disabled={!currentProject}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>新建材质</span>
                  </button>
                )}

                {/* FBX 导入 input */}
                <input
                  ref={fbx.inputRef}
                  type="file"
                  accept=".fbx"
                  onChange={fbx.handleFileSelected}
                  className="hidden"
                />
                {/* 纹理导入 input（由 useTextureImport 管理） */}
                <input
                  ref={tex.inputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={tex.handleFileSelected}
                  className="hidden"
                />
                {/* IBL 导入 input（由 useIBLImport 管理） */}
                <input
                  ref={ibl.inputRef}
                  type="file"
                  accept=".hdr,.exr"
                  onChange={ibl.handleFileSelected}
                  className="hidden"
                />
              </div>

              {/* Content Grid */}
              <div
                className="flex-1 p-4 overflow-y-auto custom-scrollbar"
                onContextMenu={
                  selectedFolder === 'scenes' || selectedFolder === 'materials'
                    ? (e) => {
                        e.preventDefault();
                        setBlankContextMenu({ x: e.clientX, y: e.clientY });
                      }
                    : undefined
                }
              >
                {selectedFolder === 'scenes' ? (
                  // 场景列表
                  scenes.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <div className="flex flex-col items-center space-y-2">
                        <span className="material-symbols-outlined text-4xl">photo_library</span>
                        <span className="text-xs">暂无场景</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-10 gap-4 content-start">
                      {scenes.map((scene) => (
                        <SceneCard
                          key={scene.id}
                          scene={scene}
                          onOpen={() => handleSceneOpen(scene.id)}
                          onRename={(name) => handleSceneRename(scene.id, name)}
                          onDelete={() => handleSceneDelete(scene.id)}
                          onNew={handleNewSceneClick}
                        />
                      ))}
                    </div>
                  )
                ) : selectedFolder === 'materials' ? (
                  // 材质列表（materialStore）
                  isMaterialsLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">加载中...</span>
                      </div>
                    </div>
                  ) : materials.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <div className="flex flex-col items-center space-y-2">
                        <span className="material-symbols-outlined text-4xl">texture</span>
                        <span className="text-xs">暂无材质资产</span>
                        <button
                          onClick={() => setShowNewMaterialDialog(true)}
                          className="text-primary hover:underline text-xs"
                        >
                          点击新建
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-10 gap-4 content-start">
                      {materials.map((mat) => (
                        <div key={mat.id}>
                          <AssetCard
                            asset={mat}
                            selected={selectedMaterialId === mat.id}
                            onSelect={() => {
                              selectMaterial(mat.id);
                              selectAsset(null);
                              clearSelection();
                            }}
                            onContextMenu={(e) => {
                              selectMaterial(mat.id);
                              selectAsset(null);
                              setMaterialContextMenu({ x: e.clientX, y: e.clientY, assetId: mat.id, assetName: mat.name });
                            }}
                            onOpen={() => {}}
                            onRename={(name) => handleRenameMaterial(mat.id, name)}
                            onDelete={() => handleDeleteMaterial(mat.id)}
                            onDragStart={(e) => handleMaterialDragStart(e, mat.id)}
                          />
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  // 资产列表（models / textures）
                  isLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">加载中...</span>
                      </div>
                    </div>
                  ) : visibleAssets.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <div className="flex flex-col items-center space-y-2">
                        <span className="material-symbols-outlined text-4xl">folder_open</span>
                        <span className="text-xs">暂无资产</span>
                        {selectedFolder === 'models' && (
                          <button
                            onClick={fbx.trigger}
                            className="text-primary hover:underline text-xs"
                          >
                            点击导入
                          </button>
                        )}
                        {selectedFolder === 'textures' && (
                          <button
                            onClick={tex.trigger}
                            className="text-primary hover:underline text-xs"
                          >
                            点击导入
                          </button>
                        )}
                        {selectedFolder === 'environments' && (
                          <button
                            onClick={ibl.trigger}
                            className="text-primary hover:underline text-xs"
                          >
                            点击导入 HDR/EXR
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-10 gap-4 content-start">
                      {visibleAssets.map((asset) => (
                        <div key={asset.id} className="relative">
                          <AssetCard
                            asset={asset}
                            selected={selectedAssetId === asset.id}
                            onSelect={() => {
                              selectAsset(asset.id);
                              selectMaterial(null);
                              clearSelection();
                            }}
                            onOpen={() => handleAssetOpen(asset.id)}
                            onRename={(name) => handleAssetRename(asset.id, name)}
                            onDelete={() => handleDeleteAsset(asset.id)}
                            onDragStart={(e) => handleAssetDragStart(e, asset.id)}
                          />
                          {/* 仅 model 类型显示层级展开按钮 */}
                          {asset.type === 'model' && selectedFolder === 'models' && (
                            <div className="absolute top-0 right-0 z-10">
                              <ModelHierarchyExpander asset={asset} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Upload Progress */}
              <UploadProgressList uploads={uploadProgress} />
            </div>
          </>
        ) : (
          /* 资产库页签 - 空状态 */
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="flex flex-col items-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-slate-600">inventory_2</span>
              <div className="text-center">
                <p className="text-base text-slate-400 mb-1">资产库</p>
                <p className="text-xs text-slate-500">等待后台资产库服务对接后展示内容</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 空白处右键菜单 */}
      {blankContextMenu && (
        <ContextMenu
          items={blankAreaMenuItems}
          position={blankContextMenu}
          onClose={() => setBlankContextMenu(null)}
        />
      )}

      {/* 材质资产右键菜单 */}
      {materialContextMenu && (
        <ContextMenu
          items={[
            {
              label: '复制',
              icon: 'content_copy',
              onClick: () => {
                handleDuplicateMaterial(materialContextMenu.assetId);
                setMaterialContextMenu(null);
              },
            },
            {
              label: '重命名',
              icon: 'edit',
              onClick: () => {
                setRenameMaterialDialog({ id: materialContextMenu.assetId, name: materialContextMenu.assetName });
                setMaterialContextMenu(null);
              },
            },
            {
              label: '删除',
              icon: 'delete',
              danger: true,
              onClick: () => {
                handleDeleteMaterial(materialContextMenu.assetId);
                setMaterialContextMenu(null);
              },
            },
          ]}
          position={materialContextMenu}
          onClose={() => setMaterialContextMenu(null)}
        />
      )}

      {/* 保存确认对话框 */}
      <Dialog
        isOpen={showSaveConfirmDialog}
        onClose={handleCancelSave}
        title="保存更改？"
        className="max-w-[400px]"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-primary">
            当前场景有未保存的更改，是否在创建新场景前保存？
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancelSave}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDiscardAndProceed}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
            >
              不保存
            </button>
            <button
              onClick={handleSaveAndProceed}
              className="px-3 py-1.5 text-xs bg-accent-blue hover:bg-accent-blue/90 text-white rounded transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </Dialog>

      {/* 新建场景命名对话框 */}
      <InputDialog
        isOpen={showNewSceneDialog}
        title="新建场景"
        placeholder="请输入场景名称"
        defaultValue="新建场景"
        onConfirm={handleCreateScene}
        onCancel={handleCancelCreate}
        confirmText="创建"
      />

      {/* FBX 导入配置对话框 */}
      {fbx.fbxFile && (
        <FBXImportDialog
          isOpen={fbx.showDialog}
          fileName={fbx.fbxFile.name}
          fileSize={fbx.fbxFile.size}
          onConfirm={fbx.handleConfirm}
          onCancel={fbx.handleCancel}
        />
      )}

      {/* FBX 导入进度对话框 */}
      <ProgressDialog
        isOpen={fbx.isImporting}
        title="导入 FBX 模型"
        percentage={fbx.importProgress.percent}
        currentTask={fbx.importProgress.step}
        canCancel={fbx.importProgress.percent < 65}
        onCancel={() => fbxImporter.abort()}
      />

      {/* 纹理导入配置对话框 */}
      {tex.pendingFile && (
        <TextureImportDialog
          isOpen={tex.showDialog}
          fileName={tex.pendingFile.name}
          fileSize={tex.pendingFile.size}
          originalWidth={tex.imageSize.w}
          originalHeight={tex.imageSize.h}
          onConfirm={tex.handleConfirm}
          onCancel={tex.handleCancel}
        />
      )}

      {/* 纹理转换进度对话框 */}
      <ProgressDialog
        isOpen={tex.isConverting}
        title="纹理转换中"
        percentage={tex.progress.percent}
        currentTask={tex.progress.step}
        canCancel={tex.progress.percent < 65}
        onCancel={tex.handleAbort}
      />
      {/* 纹理转换错误对话框 */}
      {tex.conversionError && (
        <Dialog
          isOpen={true}
          onClose={tex.clearConversionError}
          title="纹理转换失败"
          className="max-w-[420px]"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-400">{tex.conversionError}</p>
            <div className="flex justify-end">
              <button
                onClick={tex.clearConversionError}
                className="px-4 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* IBL 导入配置对话框 */}
      {ibl.pendingFile && (
        <IBLImportDialog
          isOpen={ibl.showDialog}
          fileName={ibl.pendingFile.name}
          fileSize={ibl.pendingFile.size}
          onConfirm={ibl.handleConfirm}
          onCancel={ibl.handleCancel}
        />
      )}

      {/* IBL 转换进度对话框 */}
      <ProgressDialog
        isOpen={ibl.isConverting}
        title="HDR/EXR 转换中"
        percentage={ibl.progress.percent}
        currentTask={ibl.progress.step}
        canCancel={ibl.progress.percent < 65}
        onCancel={ibl.handleAbort}
      />

      {/* IBL 转换错误对话框 */}
      {ibl.conversionError && (
        <Dialog
          isOpen={true}
          onClose={ibl.clearConversionError}
          title="环境转换失败"
          className="max-w-[420px]"
        >
          <div className="flex flex-col gap-4">
            <p className="text-sm text-red-400">{ibl.conversionError}</p>
            <div className="flex justify-end">
              <button
                onClick={ibl.clearConversionError}
                className="px-4 py-1.5 text-xs bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {/* 材质资产重命名对话框 */}
      <InputDialog
        isOpen={renameMaterialDialog !== null}
        title="重命名材质"
        placeholder="请输入新名称"
        defaultValue={renameMaterialDialog?.name ?? ''}
        confirmText="重命名"
        onConfirm={(name) => {
          if (renameMaterialDialog !== null) {
            handleRenameMaterial(renameMaterialDialog.id, name);
          }
          setRenameMaterialDialog(null);
        }}
        onCancel={() => setRenameMaterialDialog(null)}
      />

      {/* 新建材质 Dialog */}
      <Dialog
        isOpen={showNewMaterialDialog}
        onClose={() => { setShowNewMaterialDialog(false); setNewMaterialError(null); }}
        title="新建材质"
        className="max-w-[400px]"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400">名称</label>
            <input
              className="bg-[#0c0e14] border border-[#2d333f] text-sm text-white px-2 py-1.5 rounded focus:outline-none focus:ring-1 focus:ring-primary/50"
              value={newMaterialName}
              onChange={(e) => setNewMaterialName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNewMaterialConfirm()}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-400">材质类型</label>
            <select
              className="bg-[#0c0e14] border border-[#2d333f] text-sm text-white px-2 py-1.5 rounded"
              value={newMaterialType}
              onChange={(e) => setNewMaterialType(e.target.value as MaterialType)}
            >
              <option value="MeshStandardMaterial">MeshStandardMaterial</option>
              <option value="MeshPhysicalMaterial">MeshPhysicalMaterial</option>
              <option value="MeshPhongMaterial">MeshPhongMaterial</option>
              <option value="MeshLambertMaterial">MeshLambertMaterial</option>
              <option value="MeshBasicMaterial">MeshBasicMaterial</option>
              <option value="NodeMaterial">NodeMaterial（节点材质）</option>
            </select>
          </div>
          {newMaterialError && (
            <p className="text-xs text-red-400">{newMaterialError}</p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setShowNewMaterialDialog(false); setNewMaterialError(null); }}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleNewMaterialConfirm}
              className="px-3 py-1.5 text-xs bg-accent-blue hover:bg-accent-blue/90 text-white rounded transition-colors"
            >
              创建
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
