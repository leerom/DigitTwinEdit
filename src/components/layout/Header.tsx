import React, { useState, useRef } from 'react';
import { DropdownMenu, DropdownMenuItem } from '../common/DropdownMenu';
import { ConfirmDialog } from '../../features/scene/components/ConfirmDialog';
import { SceneLoader } from '../../features/scene/services/SceneLoader';
import { Upload, FileDown, Trash2 } from 'lucide-react';

export const Header: React.FC = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sceneLoader = new SceneLoader();

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
      const result = await sceneLoader.loadSceneFile(selectedFile);

      if (result.success) {
        console.log('场景导入成功');
        if (result.errorCount > 0) {
          console.warn(`部分对象加载失败: ${result.errorCount}个错误`);
        }
      } else {
        console.error('场景导入失败', result.errors);
      }
    } catch (error) {
      console.error('场景导入异常:', error);
    } finally {
      setSelectedFile(null);
    }
  };

  const handleCancelImport = () => {
    setShowConfirmDialog(false);
    setSelectedFile(null);
  };

  const sceneMenuItems: DropdownMenuItem[] = [
    {
      label: '导入场景',
      onClick: handleImportClick,
      icon: <Upload className="w-3 h-3" />,
    },
    {
      label: '导出场景',
      onClick: () => console.log('导出场景'),
      icon: <FileDown className="w-3 h-3" />,
    },
    {
      label: '清空场景',
      onClick: () => console.log('清空场景'),
      icon: <Trash2 className="w-3 h-3" />,
    },
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
          <span className="text-[10px] text-slate-500">层级: <span className="text-primary">主场景</span></span>
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

      {/* Confirm Dialog */}
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
    </header>
  );
};
