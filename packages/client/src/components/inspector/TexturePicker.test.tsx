import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TexturePicker } from './TexturePicker';

// mock useAssetStore
vi.mock('@/stores/assetStore', () => ({
  useAssetStore: (selector: any) => selector({
    assets: [
      { id: 1, name: 'brick.png',       type: 'texture', project_id: 10, updated_at: '2026-01-01', file_path: '', file_size: 0, mime_type: 'image/png',  created_at: '2026-01-01' },
      { id: 2, name: 'wood.png',        type: 'texture', project_id: 10, updated_at: '2026-01-01', file_path: '', file_size: 0, mime_type: 'image/png',  created_at: '2026-01-01' },
      { id: 3, name: 'model.glb',       type: 'model',   project_id: 10, updated_at: '2026-01-01', file_path: '', file_size: 0, mime_type: 'model/gltf-binary', created_at: '2026-01-01' },
      // 源 PNG（isSourceTexture: true，在弹出层网格中隐藏）
      { id: 4, name: 'normal_src.png',  type: 'texture', project_id: 10, updated_at: '2026-01-01', file_path: '', file_size: 0, mime_type: 'image/png',  created_at: '2026-01-01', metadata: { isSourceTexture: true } },
      // KTX2 资产，关联源图 id=4
      { id: 5, name: 'normal.ktx2',     type: 'texture', project_id: 10, updated_at: '2026-01-01', file_path: '', file_size: 0, mime_type: 'image/ktx2', created_at: '2026-01-01', metadata: { sourceTextureAssetId: 4 } },
      // KTX2 资产，无源图引用
      { id: 6, name: 'ao_no_src.ktx2',  type: 'texture', project_id: 10, updated_at: '2026-01-01', file_path: '', file_size: 0, mime_type: 'image/ktx2', created_at: '2026-01-01' },
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
    expect(onChange).toHaveBeenCalledWith({ assetId: 1, url: expect.stringContaining('/api/assets/1/download'), mimeType: 'image/png' });
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

  it('选中普通 PNG 贴图时，缩略图直接使用 value.url', () => {
    render(
      <TexturePicker
        label="漫反射贴图"
        value={{ assetId: 1, url: '/api/assets/1/download', mimeType: 'image/png' }}
        onChange={vi.fn()}
        projectId={10}
      />
    );
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('/api/assets/1/download');
    expect(img.getAttribute('crossorigin')).toBe('use-credentials');
  });

  it('选中 KTX2 贴图且存在源图时，缩略图使用源 PNG 的下载 URL', () => {
    render(
      <TexturePicker
        label="法线贴图"
        value={{ assetId: 5, url: '/api/assets/5/download', mimeType: 'image/ktx2' }}
        onChange={vi.fn()}
        projectId={10}
      />
    );
    // 缩略图应指向源 PNG（id=4）而非 KTX2（id=5）
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('/api/assets/4/download');
    expect(img.getAttribute('crossorigin')).toBe('use-credentials');
  });

  it('选中 KTX2 贴图且无源图时，显示 KTX2 占位符而非损坏的 img', () => {
    render(
      <TexturePicker
        label="AO 贴图"
        value={{ assetId: 6, url: '/api/assets/6/download', mimeType: 'image/ktx2' }}
        onChange={vi.fn()}
        projectId={10}
      />
    );
    // 不应渲染 <img>（避免损坏图标），应显示 KTX2 文字占位符
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('KTX2')).toBeTruthy();
  });
});

