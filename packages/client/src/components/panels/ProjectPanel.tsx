import React, { useEffect, useState, useRef } from 'react';
import { clsx } from 'clsx';
import { useAssetStore } from '../../stores/assetStore.js';
import { useProjectStore } from '../../stores/projectStore.js';
import { useSceneStore } from '../../stores/sceneStore.js';
import { AssetCard } from '../assets/AssetCard.js';
import { SceneCard } from './SceneCard.js';
import { UploadProgressList } from '../assets/UploadProgress.js';
import type { AssetType } from '@digittwinedit/shared';

type FolderType = 'scenes' | 'models' | 'materials' | 'textures';

export const ProjectPanel: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'project' | 'resources'>('project');
  const [selectedFolder, setSelectedFolder] = useState<FolderType>('scenes');
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { currentProject, scenes, activateScene, updateSceneMetadata, deleteScene } = useProjectStore();
  const {
    assets,
    isLoading,
    uploadProgress,
    loadAssets,
    uploadAsset,
    deleteAsset,
    updateAsset,
    getAssetUrl,
  } = useAssetStore();
  const { addAssetToScene } = useSceneStore();

  // 加载资产
  useEffect(() => {
    if (currentProject && activeTab === 'project' && selectedFolder !== 'scenes') {
      const assetType: AssetType = selectedFolder === 'models' ? 'model' : selectedFolder === 'materials' ? 'material' : 'texture';
      loadAssets(currentProject.id, assetType);
    }
  }, [currentProject, selectedFolder, activeTab, loadAssets]);

  // 场景操作处理函数
  const handleSceneOpen = async (sceneId: number) => {
    if (!currentProject) return;
    try {
      await activateScene(currentProject.id, sceneId);
    } catch (error) {
      console.error('Failed to activate scene:', error);
      alert('激活场景失败，请重试');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentProject) return;

    const type: 'model' | 'texture' = selectedFolder === 'models' ? 'model' : 'texture';

    for (const file of Array.from(files)) {
      try {
        await uploadAsset(currentProject.id, file, type);
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteAsset = async (assetId: number) => {
    if (confirm('确定要删除这个资产吗？')) {
      try {
        await deleteAsset(assetId);
        if (selectedAssetId === assetId) {
          setSelectedAssetId(null);
        }
      } catch (error) {
        console.error('Failed to delete asset:', error);
      }
    }
  };

  const handleAssetDragStart = (e: React.DragEvent, assetId: number) => {
    e.dataTransfer.setData('assetId', assetId.toString());
    e.dataTransfer.effectAllowed = 'copy';
  };

  const getAcceptTypes = () => {
    switch (selectedFolder) {
      case 'models':
        return '.glb,.gltf,.fbx,.obj';
      case 'textures':
        return '.png,.jpg,.jpeg,.webp';
      default:
        return '*';
    }
  };

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
                </div>
              </div>
            </aside>

            {/* Main Content: Asset Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between p-2 border-b border-border-dark">
                <div className="text-xs text-slate-400">
                  {selectedFolder === 'scenes' ? `${scenes.length} 个场景` : `${assets.length} 个资产`}
                </div>

                {selectedFolder !== 'materials' && selectedFolder !== 'scenes' && (
                  <button
                    onClick={handleUploadClick}
                    className="flex items-center space-x-1 px-3 py-1 bg-primary hover:bg-primary-hover text-white text-xs rounded transition-colors"
                    disabled={!currentProject}
                  >
                    <span className="material-symbols-outlined text-sm">upload</span>
                    <span>上传</span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={getAcceptTypes()}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Content Grid */}
              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
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
                        />
                      ))}
                    </div>
                  )
                ) : (
                  // 资产列表
                  isLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">加载中...</span>
                      </div>
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-500">
                      <div className="flex flex-col items-center space-y-2">
                        <span className="material-symbols-outlined text-4xl">folder_open</span>
                        <span className="text-xs">暂无资产</span>
                        {selectedFolder !== 'materials' && (
                          <button
                            onClick={handleUploadClick}
                            className="text-primary hover:underline text-xs"
                          >
                            点击上传
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-10 gap-4 content-start">
                      {assets.map((asset) => (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          selected={selectedAssetId === asset.id}
                          onSelect={() => setSelectedAssetId(asset.id)}
                          onOpen={() => handleAssetOpen(asset.id)}
                          onRename={(name) => handleAssetRename(asset.id, name)}
                          onDelete={() => handleDeleteAsset(asset.id)}
                          onDragStart={(e) => handleAssetDragStart(e, asset.id)}
                        />
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
    </div>
  );
};
