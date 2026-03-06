import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IBLConverter } from '../IBLConverter';

const { mockUploadAsset, mockUpdateAsset, mockReplaceAssetFile } = vi.hoisted(() => ({
  mockUploadAsset: vi.fn(),
  mockUpdateAsset: vi.fn(),
  mockReplaceAssetFile: vi.fn(),
}));

vi.mock('../../../api/assets', () => ({
  assetsApi: {
    uploadAsset: mockUploadAsset,
    updateAsset: mockUpdateAsset,
    replaceAssetFile: mockReplaceAssetFile,
    getAssetDownloadUrl: (id: number) => `/api/assets/${id}/download`,
  },
}));

describe('IBLConverter', () => {
  beforeEach(() => {
    mockUploadAsset.mockReset();
    mockUpdateAsset.mockReset();
    mockReplaceAssetFile.mockReset();
    vi.unstubAllGlobals();
  });

  it('accepts hdr and exr files but rejects unsupported formats', () => {
    const converter = new IBLConverter();

    expect(() => converter.validateFile(new File(['hdr'], 'studio.hdr'))).not.toThrow();
    expect(() => converter.validateFile(new File(['exr'], 'studio.exr'))).not.toThrow();
    expect(() => converter.validateFile(new File(['png'], 'studio.png'))).toThrow('仅支持 HDR/EXR');
  });

  it('uploads source, preview, and runtime assets and writes linked IBL metadata', async () => {
    const converter = new IBLConverter();
    const sourceFile = new File(['hdr-data'], 'studio.hdr', { type: 'application/octet-stream' });
    const settings = {
      maxWidth: 1024,
      compressionMode: 'UASTC' as const,
      generateMipmaps: true,
    };

    vi.spyOn(converter as any, '_convertInWorker').mockResolvedValue({
      previewFile: new File(['png-data'], 'studio.preview.png', { type: 'image/png' }),
      runtimeFile: new File(['ktx2-data'], 'studio.ktx2', { type: 'image/ktx2' }),
      originalWidth: 2048,
      originalHeight: 1024,
      runtimeWidth: 1024,
      runtimeHeight: 512,
      originalFormat: 'hdr',
    });

    mockUploadAsset
      .mockResolvedValueOnce({ id: 11 } as any)
      .mockResolvedValueOnce({ id: 12 } as any)
      .mockResolvedValueOnce({ id: 13 } as any);
    mockUpdateAsset.mockImplementation(async (id: number, updates: any) => ({ id, ...updates }));

    const result = await converter.convert(sourceFile, settings, 7, () => {});

    expect(mockUploadAsset).toHaveBeenCalledTimes(3);
    expect(mockUploadAsset.mock.calls.map((call) => call[1].name)).toEqual([
      'studio.hdr',
      'studio.preview.png',
      'studio.ktx2',
    ]);

    expect(mockUpdateAsset).toHaveBeenCalledWith(11, {
      metadata: expect.objectContaining({
        usage: 'ibl',
        isSourceEnvironment: true,
        originalFormat: 'hdr',
      }),
    });

    expect(mockUpdateAsset).toHaveBeenCalledWith(13, {
      metadata: {
        usage: 'ibl',
        format: 'ktx2',
        sourceEnvironmentAssetId: 11,
        previewAssetId: 12,
        originalFormat: 'hdr',
        originalDimensions: { width: 2048, height: 1024 },
        runtimeDimensions: { width: 1024, height: 512 },
        convertSettings: settings,
      },
    });

    expect(mockUpdateAsset).toHaveBeenCalledWith(12, {
      metadata: {
        usage: 'ibl',
        isEnvironmentPreview: true,
        runtimeAssetId: 13,
      },
    });

    expect(result).toEqual({
      sourceAssetId: 11,
      previewAssetId: 12,
      runtimeAssetId: 13,
    });
  });

  it('reimports IBL from the hidden source asset and keeps runtime and preview asset ids', async () => {
    const converter = new IBLConverter();
    const runtimeAsset = {
      id: 13,
      name: 'studio.ktx2',
      type: 'texture',
      project_id: 7,
      file_path: '/uploads/studio.ktx2',
      file_size: 1024,
      mime_type: 'image/ktx2',
      created_at: '',
      updated_at: '',
      metadata: {
        usage: 'ibl',
        format: 'ktx2',
        sourceEnvironmentAssetId: 11,
        previewAssetId: 12,
        originalFormat: 'hdr',
        originalDimensions: { width: 2048, height: 1024 },
        runtimeDimensions: { width: 1024, height: 512 },
        convertSettings: {
          maxWidth: 1024,
          compressionMode: 'UASTC',
          generateMipmaps: true,
        },
      },
    } as any;
    const settings = {
      maxWidth: 2048,
      compressionMode: 'UASTC' as const,
      generateMipmaps: false,
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['hdr-data'], { type: 'application/octet-stream' }),
      })
    );

    vi.spyOn(converter as any, '_convertInWorker').mockResolvedValue({
      previewFile: new File(['png-data'], 'studio.preview.png', { type: 'image/png' }),
      runtimeFile: new File(['ktx2-data'], 'studio.ktx2', { type: 'image/ktx2' }),
      originalWidth: 4096,
      originalHeight: 2048,
      runtimeWidth: 2048,
      runtimeHeight: 1024,
      originalFormat: 'hdr',
    });

    mockReplaceAssetFile.mockImplementation(async (id: number) => ({ id }));
    mockUpdateAsset.mockImplementation(async (id: number, updates: any) => ({ id, ...updates }));

    const result = await (converter as any).reimport(runtimeAsset, settings, () => {});

    expect(fetch).toHaveBeenCalledWith('/api/assets/11/download', { credentials: 'include' });
    expect(mockReplaceAssetFile.mock.calls.map((call) => call[0])).toEqual([12, 13]);
    expect(mockReplaceAssetFile.mock.calls.map((call) => call[1].name)).toEqual(['studio.preview.png', 'studio.ktx2']);
    expect(mockUpdateAsset).toHaveBeenCalledWith(13, {
      metadata: {
        usage: 'ibl',
        format: 'ktx2',
        sourceEnvironmentAssetId: 11,
        previewAssetId: 12,
        originalFormat: 'hdr',
        originalDimensions: { width: 4096, height: 2048 },
        runtimeDimensions: { width: 2048, height: 1024 },
        convertSettings: settings,
      },
    });
    expect(result.id).toBe(13);
  });
});
