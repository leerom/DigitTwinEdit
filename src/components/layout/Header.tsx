import React, { useState, useRef } from 'react';
import { DropdownMenu, DropdownMenuItem } from '../common/DropdownMenu';
import { ConfirmDialog } from '../../features/scene/components/ConfirmDialog';
import { Dialog } from '../common/Dialog';
import { InputDialog } from '../common/InputDialog';
import { SceneLoader } from '../../features/scene/services/SceneLoader';
import { SceneManager } from '../../features/scene/services/SceneManager';
import { useSceneStore } from '../../stores/sceneStore';
import { useEditorStore } from '../../stores/editorStore';
import { Upload, FileDown, FilePlus, Box, Circle, Square, Sun, Layers, Cylinder } from 'lucide-react';

export const Header: React.FC = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sceneLoader = new SceneLoader();

  const { isDirty, scene, markClean, loadScene, addObject } = useSceneStore();
  const clearSelection = useEditorStore((state) => state.clearSelection);

  const handleImportClick = () => {
    // 触发文件选择
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowConfirmDialog(true);
    }
    // 清空input值,允许重复选择同一文件
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setShowConfirmDialog(false);

    try {
      await sceneLoader.loadSceneFile(selectedFile);
    } catch (error) {
      // Silently fail for now
    } finally {
      setSelectedFile(null);
    }
  };

  const handleCancelImport = () => {
    setShowConfirmDialog(false);
    setSelectedFile(null);
  };

  const handleNewSceneClick = () => {
    if (isDirty) {
      setShowSaveConfirmDialog(true);
    } else {
      setShowNewSceneDialog(true);
    }
  };

  const handleSaveAndProceed = () => {
    SceneManager.saveSceneToFile(scene);
    markClean();
    setShowSaveConfirmDialog(false);
    setShowNewSceneDialog(true);
  };

  const handleDontSaveAndProceed = () => {
    setShowSaveConfirmDialog(false);
    setShowNewSceneDialog(true);
  };

  const handleCreateScene = (name: string) => {
    const newScene = SceneManager.createNewScene(name);
    loadScene(newScene);
    SceneManager.saveSceneToFile(newScene);
    markClean();
    clearSelection();
    setShowNewSceneDialog(false);
  };

  const sceneMenuItems: DropdownMenuItem[] = [
    {
      label: '新建场景',
      onClick: handleNewSceneClick,
      icon: <FilePlus className="w-3 h-3" />,
    },
    {
      label: '导入场景',
      onClick: handleImportClick,
      icon: <Upload className="w-3 h-3" />,
    },
    {
      label: '导出场景',
      onClick: () => SceneManager.saveSceneToFile(scene),
      icon: <FileDown className="w-3 h-3" />,
    },
  ];

  const addMenuItems: DropdownMenuItem[] = [
    {
      label: '3D对象',
      icon: <Box className="w-3 h-3" />,
      children: [
        {
          label: '平面 (Plane)',
          onClick: () => addObject(SceneManager.createMesh('Plane', 'plane')),
          icon: <Square className="w-3 h-3" />,
        },
        {
          label: '立方体 (Cube)',
          onClick: () => addObject(SceneManager.createMesh('Cube', 'box')),
          icon: <Box className="w-3 h-3" />,
        },
        {
          label: '球体 (Sphere)',
          onClick: () => addObject(SceneManager.createMesh('Sphere', 'sphere')),
          icon: <Circle className="w-3 h-3" />,
        },
        {
            label: '圆柱体 (Cylinder)',
            onClick: () => addObject(SceneManager.createMesh('Cylinder', 'cylinder')),
            icon: <Cylinder className="w-3 h-3" />,
        },
        {
          label: '胶囊体 (Capsule)',
          onClick: () => addObject(SceneManager.createMesh('Capsule', 'capsule')),
          icon: <div className="w-3 h-3 border border-current rounded-full" />,
        },
      ]
    },
    {
      label: '光源',
      icon: <Sun className="w-3 h-3" />,
      children: [
        { label: '环境光 (Ambient)', disabled: true },
        { label: '平行光 (Directional)', disabled: true },
        { label: '半球光 (Hemisphere)', disabled: true },
        { label: '点光源 (Point)', disabled: true },
        { label: '聚光灯 (Spot)', disabled: true },
      ]
    },
    {
      label: '模型',
      icon: <Layers className="w-3 h-3" />,
      disabled: true
    }
  ];

  const MenuItem: React.FC<{ label: string }> = ({ label }) => (
    <button className="px-2 py-1 text-xs hover:bg-slate-700 rounded transition-colors text-slate-300">
      {label}
    </button>
  );

  return (
    <header className="h-10 bg-header-dark border-b border-border-dark flex items-center px-3 justify-between z-50 flex-shrink-0 select-none">
      {/* Left: Logo & Menu */}
      <div className="flex items-center space-x-4">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-base">deployed_code</span>
          </div>
          <span className="font-bold tracking-tight text-sm text-white">TWIN<span className="text-primary">ENGINE</span></span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border-dark"></div>

        {/* Navigation Menu */}
        <nav className="flex items-center space-x-1">
          <DropdownMenu
            trigger={
              <button className="px-2 py-1 text-xs hover:bg-slate-700 rounded transition-colors text-slate-300">
                场景
              </button>
            }
            items={sceneMenuItems}
          />
          <MenuItem label="编辑" />
          <DropdownMenu
            trigger={
              <button className="px-2 py-1 text-xs hover:bg-slate-700 rounded transition-colors text-slate-300 flex items-center gap-1">
                添加
              </button>
            }
            items={addMenuItems}
          />
          <MenuItem label="资产" />
          <MenuItem label="游戏对象" />
          <MenuItem label="组件" />
          <MenuItem label="窗口" />
          <MenuItem label="帮助" />
        </nav>
      </div>

      {/* Right: Scene Info & Publish Button */}
      <div className="flex items-center space-x-4">
        <div className="h-4 w-px bg-border-dark"></div>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] text-slate-500">层级: <span className="text-primary">{scene.name}</span></span>
          <button className="bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded text-[10px] font-bold border border-primary/30 transition-all">
            发布场景
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".scene.json,.json"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Confirm Dialog for Import */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelImport}
        title="确认导入场景"
        message="导入新场景将完全替换当前场景内容,是否继续?"
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
        confirmText="确认"
        cancelText="取消"
      />

      {/* New Scene Input Dialog */}
      <InputDialog
        isOpen={showNewSceneDialog}
        title="新建场景"
        placeholder="请输入场景名称"
        defaultValue="New Scene"
        onConfirm={handleCreateScene}
        onCancel={() => setShowNewSceneDialog(false)}
        confirmText="创建"
      />

      {/* Save Confirm Dialog */}
      <Dialog
        isOpen={showSaveConfirmDialog}
        onClose={() => setShowSaveConfirmDialog(false)}
        title="保存更改？"
        className="max-w-[400px]"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-primary">
            当前场景有未保存的更改，是否在创建新场景前保存？
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowSaveConfirmDialog(false)}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDontSaveAndProceed}
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
    </header>
  );
};
