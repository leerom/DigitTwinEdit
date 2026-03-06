import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AssetService } from '../assetService';
import { AssetModel } from '../../models/Asset.js';
import { fileStorage } from '../../utils/fileStorage.js';

describe('AssetService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes linked source and preview assets when removing an IBL runtime asset', async () => {
    const runtimeAsset = {
      id: 13,
      project_id: 7,
      name: 'studio.ktx2',
      type: 'texture',
      file_path: 'projects/7/textures/studio.ktx2',
      file_size: 1024,
      mime_type: 'image/ktx2',
      thumbnail_path: 'thumbnails/13.jpg',
      metadata: {
        usage: 'ibl',
        sourceEnvironmentAssetId: 11,
        previewAssetId: 12,
      },
      created_at: new Date(),
      updated_at: new Date(),
    };
    const sourceAsset = {
      id: 11,
      project_id: 7,
      name: 'studio.hdr',
      type: 'texture',
      file_path: 'projects/7/textures/studio.hdr',
      file_size: 2048,
      mime_type: 'application/octet-stream',
      metadata: { usage: 'ibl', isSourceEnvironment: true },
      created_at: new Date(),
      updated_at: new Date(),
    };
    const previewAsset = {
      id: 12,
      project_id: 7,
      name: 'studio.preview.png',
      type: 'texture',
      file_path: 'projects/7/textures/studio.preview.png',
      file_size: 512,
      mime_type: 'image/png',
      thumbnail_path: 'thumbnails/12.jpg',
      metadata: { usage: 'ibl', isEnvironmentPreview: true },
      created_at: new Date(),
      updated_at: new Date(),
    };

    jest.spyOn(AssetModel, 'findById').mockImplementation(async (id: number) => {
      if (id === 13) return runtimeAsset as any;
      if (id === 11) return sourceAsset as any;
      if (id === 12) return previewAsset as any;
      return null;
    });
    const deleteAssetSpy = jest.spyOn(AssetModel, 'delete').mockResolvedValue(true);
    const deleteFileSpy = jest.spyOn(fileStorage, 'deleteFile').mockResolvedValue(undefined);

    const service = new AssetService();
    await service.deleteAsset(13);

    expect(deleteFileSpy).toHaveBeenCalledTimes(5);
    expect(deleteFileSpy.mock.calls.map((call: any[]) => call[0])).toEqual([
      'projects/7/textures/studio.ktx2',
      'thumbnails/13.jpg',
      'projects/7/textures/studio.hdr',
      'projects/7/textures/studio.preview.png',
      'thumbnails/12.jpg',
    ]);
    expect(deleteAssetSpy.mock.calls.map((call: any[]) => call[0])).toEqual([13, 11, 12]);
  });

  it('skips thumbnail generation for hdr source uploads', async () => {
    const service = new AssetService();
    const generateThumbnailSpy = jest.spyOn(service, 'generateThumbnail').mockResolvedValue(null);

    jest.spyOn(fileStorage, 'generateUniqueFilename').mockReturnValue('studio.hdr');
    jest.spyOn(fileStorage, 'saveFile').mockResolvedValue('projects/7/textures/studio.hdr');
    jest.spyOn(AssetModel, 'create').mockResolvedValue({
      id: 11,
      project_id: 7,
      name: 'studio.hdr',
      type: 'texture',
      file_path: 'projects/7/textures/studio.hdr',
      file_size: 1024,
      mime_type: 'application/octet-stream',
      metadata: { format: 'hdr' },
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    await service.uploadAsset(
      7,
      {
        originalname: 'studio.hdr',
        size: 1024,
        mimetype: 'application/octet-stream',
        buffer: Buffer.from('hdr-data'),
      } as Express.Multer.File,
      'texture'
    );

    expect(generateThumbnailSpy).not.toHaveBeenCalled();
  });
});
