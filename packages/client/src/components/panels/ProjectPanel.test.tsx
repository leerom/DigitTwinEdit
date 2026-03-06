import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectPanel } from './ProjectPanel';

const mockLoadAssets = vi.fn();
const mockLoadMaterials = vi.fn();
const mockSelectAsset = vi.fn();
const mockSelectMaterial = vi.fn();
const mockClearSelection = vi.fn();
const mockDeleteAsset = vi.fn();
const mockSetDefaultEnvironment = vi.fn();

const assetStoreState = {
  assets: [],
  isLoading: false,
  uploadProgress: {},
  selectedAssetId: null,
  loadAssets: mockLoadAssets,
  deleteAsset: mockDeleteAsset,
  updateAsset: vi.fn(),
  selectAsset: mockSelectAsset,
};

const projectStoreState = {
  currentProject: { id: 1, name: 'Project 1' },
  scenes: [],
  switchScene: vi.fn(),
  updateSceneMetadata: vi.fn(),
  deleteScene: vi.fn(),
};

const materialStoreState = {
  materials: [],
  isLoading: false,
  selectedMaterialId: null,
  loadMaterials: mockLoadMaterials,
  createMaterial: vi.fn(),
  duplicateMaterial: vi.fn(),
  renameMaterial: vi.fn(),
  deleteMaterial: vi.fn(),
  selectMaterial: mockSelectMaterial,
};

const sceneStoreState = {
  addAssetToScene: vi.fn(),
  setDefaultEnvironment: mockSetDefaultEnvironment,
  scene: {
    objects: {},
    settings: {
      environment: { mode: 'default', assetId: null },
    },
  },
};

vi.mock('../../stores/assetStore.js', () => ({
  useAssetStore: () => assetStoreState,
}));

vi.mock('../../stores/projectStore.js', () => ({
  useProjectStore: () => projectStoreState,
}));

vi.mock('../../stores/materialStore.js', () => ({
  useMaterialStore: () => materialStoreState,
}));

vi.mock('../../stores/sceneStore.js', () => ({
  useSceneStore: () => sceneStoreState,
}));

vi.mock('../../stores/editorStore.js', () => ({
  useEditorStore: (selector: any) => selector({ clearSelection: mockClearSelection }),
}));

vi.mock('../../hooks/useNewSceneFlow.js', () => ({
  useNewSceneFlow: () => ({
    showSaveConfirmDialog: false,
    showNewSceneDialog: false,
    handleNewSceneClick: vi.fn(),
    handleSaveAndProceed: vi.fn(),
    handleDiscardAndProceed: vi.fn(),
    handleCancelSave: vi.fn(),
    handleCreateScene: vi.fn(),
    handleCancelCreate: vi.fn(),
  }),
}));

vi.mock('../../hooks/useFBXImport.js', () => ({
  useFBXImport: () => ({
    inputRef: { current: null },
    trigger: vi.fn(),
    handleFileSelected: vi.fn(),
    fbxFile: null,
    showDialog: false,
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
    isImporting: false,
    importProgress: { percent: 0, step: '' },
  }),
}));

vi.mock('../../features/textures/useTextureImport.js', () => ({
  useTextureImport: () => ({
    inputRef: { current: null },
    trigger: vi.fn(),
    handleFileSelected: vi.fn(),
    pendingFile: null,
    showDialog: false,
    imageSize: { w: 0, h: 0 },
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
    isConverting: false,
    progress: { percent: 0, step: '' },
    handleAbort: vi.fn(),
    conversionError: null,
    clearConversionError: vi.fn(),
  }),
}));

vi.mock('../../features/ibl/useIBLImport.js', () => ({
  useIBLImport: () => ({
    inputRef: { current: null },
    trigger: vi.fn(),
    handleFileSelected: vi.fn(),
    pendingFile: null,
    showDialog: false,
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
    isConverting: false,
    progress: { percent: 0, step: '' },
    handleAbort: vi.fn(),
    conversionError: null,
    clearConversionError: vi.fn(),
  }),
}));

vi.mock('../assets/AssetCard.js', () => ({
  AssetCard: ({ asset, onSelect, onDelete }: any) => (
    <div>
      <button onClick={onSelect}>{asset.name}</button>
      <button aria-label={`删除 ${asset.name}`} onClick={onDelete}>删除</button>
    </div>
  ),
}));

vi.mock('../assets/ModelHierarchyExpander.js', () => ({
  ModelHierarchyExpander: () => null,
}));

vi.mock('./SceneCard.js', () => ({
  SceneCard: ({ scene }: any) => <div>{scene.name}</div>,
}));

vi.mock('../assets/UploadProgress.js', () => ({
  UploadProgressList: () => null,
}));

vi.mock('../common/ContextMenu.js', () => ({
  ContextMenu: () => null,
}));

vi.mock('../common/Dialog.js', () => ({
  Dialog: ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null),
}));

vi.mock('../common/InputDialog.js', () => ({
  InputDialog: () => null,
}));

vi.mock('../../features/fbx/FBXImportDialog.js', () => ({
  FBXImportDialog: () => null,
}));

vi.mock('../../features/scene/components/ProgressDialog.js', () => ({
  ProgressDialog: () => null,
}));

vi.mock('../../features/fbx/FBXImporter.js', () => ({
  fbxImporter: { abort: vi.fn() },
}));

vi.mock('../../features/textures/TextureImportDialog.js', () => ({
  TextureImportDialog: () => null,
}));

vi.mock('../../features/ibl/IBLImportDialog.js', () => ({
  IBLImportDialog: () => null,
}));

describe('ProjectPanel IBL integration', () => {
  beforeEach(() => {
    mockLoadAssets.mockReset();
    mockLoadMaterials.mockReset();
    mockSelectAsset.mockReset();
    mockSelectMaterial.mockReset();
    mockClearSelection.mockReset();
    mockDeleteAsset.mockReset();
    mockDeleteAsset.mockResolvedValue(undefined);
    mockSetDefaultEnvironment.mockReset();
    vi.stubGlobal('confirm', vi.fn(() => true));

    sceneStoreState.scene.settings.environment = { mode: 'default', assetId: null };

    assetStoreState.assets = [
      {
        id: 1,
        project_id: 1,
        name: 'studio.ktx2',
        type: 'texture',
        file_path: '/uploads/studio.ktx2',
        file_size: 123,
        mime_type: 'image/ktx2',
        metadata: {
          usage: 'ibl',
          format: 'ktx2',
          sourceEnvironmentAssetId: 2,
          previewAssetId: 3,
        },
        created_at: '',
        updated_at: '',
      },
      {
        id: 2,
        project_id: 1,
        name: 'studio.hdr',
        type: 'texture',
        file_path: '/uploads/studio.hdr',
        file_size: 123,
        mime_type: 'application/octet-stream',
        metadata: {
          usage: 'ibl',
          isSourceEnvironment: true,
        },
        created_at: '',
        updated_at: '',
      },
      {
        id: 3,
        project_id: 1,
        name: 'studio.preview.png',
        type: 'texture',
        file_path: '/uploads/studio.preview.png',
        file_size: 123,
        mime_type: 'image/png',
        metadata: {
          usage: 'ibl',
          isEnvironmentPreview: true,
          runtimeAssetId: 1,
        },
        created_at: '',
        updated_at: '',
      },
      {
        id: 4,
        project_id: 1,
        name: 'albedo.ktx2',
        type: 'texture',
        file_path: '/uploads/albedo.ktx2',
        file_size: 123,
        mime_type: 'image/ktx2',
        metadata: {
          format: 'ktx2',
          sourceTextureAssetId: 5,
        },
        created_at: '',
        updated_at: '',
      },
    ];
  });

  it('shows an Environments folder in the asset tree', () => {
    render(<ProjectPanel />);

    expect(screen.getByText('Environments')).toBeInTheDocument();
  });

  it('hides IBL assets from the Textures folder', () => {
    render(<ProjectPanel />);

    fireEvent.click(screen.getByText('Textures'));

    expect(screen.getByText('albedo.ktx2')).toBeInTheDocument();
    expect(screen.queryByText('studio.ktx2')).not.toBeInTheDocument();
    expect(screen.queryByText('studio.hdr')).not.toBeInTheDocument();
    expect(screen.queryByText('studio.preview.png')).not.toBeInTheDocument();
  });

  it('shows only runtime IBL assets and the HDR EXR import button in the Environments folder', () => {
    render(<ProjectPanel />);

    fireEvent.click(screen.getByText('Environments'));

    expect(screen.getByText('studio.ktx2')).toBeInTheDocument();
    expect(screen.queryByText('albedo.ktx2')).not.toBeInTheDocument();
    expect(screen.queryByText('studio.hdr')).not.toBeInTheDocument();
    expect(screen.queryByText('studio.preview.png')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导入 HDR/EXR' })).toBeInTheDocument();
  });

  it('resets the scene environment to default when deleting the active runtime IBL asset', async () => {
    sceneStoreState.scene.settings.environment = { mode: 'asset', assetId: 1 };

    render(<ProjectPanel />);

    fireEvent.click(screen.getByText('Environments'));
    fireEvent.click(screen.getByRole('button', { name: '删除 studio.ktx2' }));

    await waitFor(() => {
      expect(mockDeleteAsset).toHaveBeenCalledWith(1);
    });
    expect(mockSetDefaultEnvironment).toHaveBeenCalledTimes(1);
  });
});
