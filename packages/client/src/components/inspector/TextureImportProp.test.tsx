import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TextureImportProp } from './TextureImportProp';
import type { Asset } from '@digittwinedit/shared';

// Mock useAssetStore
vi.mock('@/stores/assetStore', () => ({
  useAssetStore: (selector: any) => selector({
    assets: [
      {
        id: 4,
        name: 'normal_src.png',
        type: 'texture',
        project_id: 10,
        updated_at: '2026-01-01',
        file_path: '',
        file_size: 0,
        mime_type: 'image/png',
        created_at: '2026-01-01',
        metadata: { isSourceTexture: true },
      },
    ],
    loadAssets: vi.fn(),
  }),
}));

// Mock textureConverter
vi.mock('@/features/textures/TextureConverter', () => ({
  textureConverter: {
    reimport: vi.fn().mockResolvedValue({
      id: 5,
      metadata: {
        sourceTextureAssetId: 4,
        convertSettings: {
          compressionMode: 'UASTC',
          quality: 200,
          colorSpace: 'sRGB',
          generateMipmaps: true,
          potResize: false,
          potMode: 'nearest',
          hasAlpha: false,
        },
      },
    }),
  },
}));

const makeKtx2Asset = (overrides?: Partial<Asset>): Asset => ({
  id: 5,
  name: 'normal.ktx2',
  type: 'texture',
  project_id: 10,
  updated_at: '2026-01-01',
  file_path: '',
  file_size: 1024,
  mime_type: 'image/ktx2',
  created_at: '2026-01-01',
  metadata: {
    sourceTextureAssetId: 4,
    convertSettings: {
      compressionMode: 'ETC1S',
      quality: 200,
      colorSpace: 'sRGB',
      generateMipmaps: true,
      potResize: false,
      potMode: 'nearest',
      hasAlpha: false,
    },
    originalName: 'normal_src.png',
  },
  ...overrides,
});

describe('TextureImportProp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('普通 PNG 资产不渲染（null）', () => {
    const asset: Asset = {
      id: 1,
      name: 'brick.png',
      type: 'texture',
      project_id: 10,
      updated_at: '2026-01-01',
      file_path: '',
      file_size: 0,
      mime_type: 'image/png',
      created_at: '2026-01-01',
    };
    const { container } = render(
      <TextureImportProp asset={asset} projectId={10} onReimportComplete={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('无 sourceTextureAssetId 的 KTX2 也不渲染', () => {
    const asset = makeKtx2Asset({ metadata: { convertSettings: {} } });
    const { container } = render(
      <TextureImportProp asset={asset} projectId={10} onReimportComplete={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('有效 KTX2 资产渲染标题和参数', () => {
    render(
      <TextureImportProp asset={makeKtx2Asset()} projectId={10} onReimportComplete={vi.fn()} />
    );
    expect(screen.getByText('纹理导入设置')).toBeTruthy();
    // 确认压缩模式下拉框显示
    expect(screen.getByDisplayValue('ETC1S（文件小）')).toBeTruthy();
  });

  it('初始状态：按钮禁用（无修改）', () => {
    render(
      <TextureImportProp asset={makeKtx2Asset()} projectId={10} onReimportComplete={vi.fn()} />
    );
    const btn = screen.getByRole('button', { name: /重新导入/ });
    expect(btn).toBeDisabled();
  });

  it('修改压缩模式后 isDirty badge 出现，按钮可用', () => {
    render(
      <TextureImportProp asset={makeKtx2Asset()} projectId={10} onReimportComplete={vi.fn()} />
    );
    const select = screen.getByDisplayValue('ETC1S（文件小）');
    fireEvent.change(select, { target: { value: 'UASTC' } });
    expect(screen.getByText('已修改')).toBeTruthy();
    expect(screen.getByRole('button', { name: /重新导入/ })).not.toBeDisabled();
  });

  it('源文件不存在时显示警告', () => {
    // sourceTextureAssetId=99 不在 assets mock 列表中
    const asset = makeKtx2Asset({
      metadata: {
        sourceTextureAssetId: 99,
        convertSettings: {
          compressionMode: 'ETC1S',
          quality: 200,
          colorSpace: 'sRGB',
          generateMipmaps: true,
          potResize: false,
          potMode: 'nearest',
          hasAlpha: false,
        },
        originalName: 'normal_src.png',
      },
    });
    render(
      <TextureImportProp asset={asset} projectId={10} onReimportComplete={vi.fn()} />
    );
    expect(screen.getByText(/源文件已删除/)).toBeTruthy();
  });

  it('源文件不存在时即使 isDirty 也禁用按钮', () => {
    const asset = makeKtx2Asset({
      metadata: {
        sourceTextureAssetId: 99,
        convertSettings: {
          compressionMode: 'ETC1S',
          quality: 200,
          colorSpace: 'sRGB',
          generateMipmaps: true,
          potResize: false,
          potMode: 'nearest',
          hasAlpha: false,
        },
        originalName: 'normal_src.png',
      },
    });
    render(
      <TextureImportProp asset={asset} projectId={10} onReimportComplete={vi.fn()} />
    );
    const select = screen.getByDisplayValue('ETC1S（文件小）');
    fireEvent.change(select, { target: { value: 'UASTC' } });
    expect(screen.getByRole('button', { name: /重新导入/ })).toBeDisabled();
  });

  it('点击重新导入调用 textureConverter.reimport 并执行回调', async () => {
    const { textureConverter } = await import('@/features/textures/TextureConverter');
    const onComplete = vi.fn();
    const asset = makeKtx2Asset();

    render(
      <TextureImportProp asset={asset} projectId={10} onReimportComplete={onComplete} />
    );

    const select = screen.getByDisplayValue('ETC1S（文件小）');
    fireEvent.change(select, { target: { value: 'UASTC' } });

    fireEvent.click(screen.getByRole('button', { name: /重新导入/ }));

    await waitFor(() => {
      expect(textureConverter.reimport).toHaveBeenCalledWith(
        asset,
        expect.objectContaining({ compressionMode: 'UASTC' }),
        expect.any(Function)
      );
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
