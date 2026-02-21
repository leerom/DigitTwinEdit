import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelImportProp } from '../ModelImportProp';
import type { Asset } from '@digittwinedit/shared';
import { DEFAULT_FBX_IMPORT_SETTINGS } from '../../../features/fbx/types';
import { useAssetStore } from '../../../stores/assetStore';

// GLB 资产（通过 FBX 导入，有 sourceFbxAssetId）
const mockGlbAsset: Asset = {
  id: 10,
  project_id: 1,
  name: 'building.glb',
  type: 'model',
  file_path: '/uploads/building.glb',
  file_size: 2048,
  mime_type: 'model/gltf-binary',
  created_at: '',
  updated_at: '',
  metadata: {
    format: 'glb',
    sourceFbxAssetId: 42,
    importSettings: {
      ...DEFAULT_FBX_IMPORT_SETTINGS,
      scale: 2.0,
    },
  },
};

// 对应的源 FBX 资产（id=42）
const mockFbxSourceAsset: Asset = {
  id: 42,
  project_id: 1,
  name: 'building.fbx',
  type: 'model',
  file_path: '/uploads/building.fbx',
  file_size: 5000000,
  mime_type: 'application/octet-stream',
  created_at: '',
  updated_at: '',
  metadata: { isSourceFbx: true },
};

// GLB 资产（直接上传，无 sourceFbxAssetId）
const mockDirectGlbAsset: Asset = {
  id: 11,
  project_id: 1,
  name: 'direct.glb',
  type: 'model',
  file_path: '/uploads/direct.glb',
  file_size: 1024,
  mime_type: 'model/gltf-binary',
  created_at: '',
  updated_at: '',
  metadata: {},
};

describe('ModelImportProp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 预置 assetStore：包含源 FBX，使 sourceFbxExists = true
    useAssetStore.setState({ assets: [mockFbxSourceAsset], selectedAssetId: null });
  });

  afterEach(() => {
    useAssetStore.setState({ assets: [], selectedAssetId: null });
  });

  it('renders import settings section title', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    expect(screen.getByText('模型导入设置')).toBeInTheDocument();
  });

  it('displays the original FBX source file ID', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('shows saved scale value from metadata', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    const scaleInput = screen.getByRole('spinbutton');
    expect((scaleInput as HTMLInputElement).value).toBe('2');
  });

  it('shows "重新导入" button', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    expect(screen.getByRole('button', { name: '重新导入' })).toBeInTheDocument();
  });

  it('"重新导入" button is disabled when no changes', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    expect(screen.getByRole('button', { name: '重新导入' })).toBeDisabled();
  });

  it('"重新导入" button becomes enabled after settings change', () => {
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    const scaleInput = screen.getByRole('spinbutton');
    fireEvent.change(scaleInput, { target: { value: '3' } });
    expect(screen.getByRole('button', { name: '重新导入' })).not.toBeDisabled();
  });

  it('shows warning and disables button when source FBX is deleted', () => {
    // 清空 assets，模拟源 FBX 被删除
    useAssetStore.setState({ assets: [], selectedAssetId: null });
    render(<ModelImportProp asset={mockGlbAsset} projectId={1} onReimportComplete={vi.fn()} />);
    expect(screen.getByText('源 FBX 已删除，无法重新导入')).toBeInTheDocument();
    // 按钮因 sourceFbxExists=false 而禁用
    expect(screen.getByRole('button', { name: '重新导入' })).toBeDisabled();
  });

  it('returns null when asset has no sourceFbxAssetId', () => {
    const { container } = render(
      <ModelImportProp asset={mockDirectGlbAsset} projectId={1} onReimportComplete={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
