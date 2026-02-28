import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TexturePicker } from './TexturePicker';

// mock useAssetStore
vi.mock('@/stores/assetStore', () => ({
  useAssetStore: (selector: any) => selector({
    assets: [
      { id: 1, name: 'brick.png', type: 'texture', project_id: 10, updated_at: '2026-01-01', file_path: '', file_size: 0, mime_type: 'image/png', created_at: '2026-01-01' },
      { id: 2, name: 'wood.png',  type: 'texture', project_id: 10, updated_at: '2026-01-01', file_path: '', file_size: 0, mime_type: 'image/png', created_at: '2026-01-01' },
      { id: 3, name: 'model.glb', type: 'model',   project_id: 10, updated_at: '2026-01-01', file_path: '', file_size: 0, mime_type: 'model/gltf-binary', created_at: '2026-01-01' },
    ],
    loadAssets: vi.fn(),
  }),
}));

// mock assetsApi
vi.mock('@/api/assets', () => ({
  assetsApi: {
    getAssetDownloadUrl: (id: number) => `/api/assets/${id}/download`,
    uploadAsset: vi.fn().mockResolvedValue({ id: 99, name: 'new.png', type: 'texture', updated_at: '2026-01-01', file_path: '', file_size: 0, mime_type: 'image/png', created_at: '2026-01-01' }),
  },
}));

describe('TexturePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未选中时显示"无"占位', () => {
    render(<TexturePicker label="漫反射贴图" value={null} onChange={vi.fn()} projectId={10} />);
    expect(screen.getByText('无')).toBeTruthy();
  });

  it('点击"选择"按钮展开弹出层，只展示 texture 类型资产', async () => {
    render(<TexturePicker label="漫反射贴图" value={null} onChange={vi.fn()} projectId={10} />);
    fireEvent.click(screen.getByText('选择'));
    await waitFor(() => {
      expect(screen.getByText('brick.png')).toBeTruthy();
      expect(screen.getByText('wood.png')).toBeTruthy();
      // model.glb 不应出现
      expect(screen.queryByText('model.glb')).toBeNull();
    });
  });

  it('点击资产后触发 onChange 并关闭弹出层', async () => {
    const onChange = vi.fn();
    render(<TexturePicker label="漫反射贴图" value={null} onChange={onChange} projectId={10} />);
    fireEvent.click(screen.getByText('选择'));
    await waitFor(() => screen.getByText('brick.png'));
    fireEvent.click(screen.getByText('brick.png'));
    expect(onChange).toHaveBeenCalledWith({ assetId: 1, url: expect.stringContaining('/api/assets/1/download') });
  });

  it('点击×清除贴图', () => {
    const onChange = vi.fn();
    render(
      <TexturePicker
        label="漫反射贴图"
        value={{ assetId: 1, url: '/api/assets/1/download' }}
        onChange={onChange}
        projectId={10}
      />
    );
    fireEvent.click(screen.getByLabelText('清除贴图'));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
