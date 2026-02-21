import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FBXImporter } from '../FBXImporter';

// 只测试可以单元测试的部分：validateFile
// Worker 和 API 调用需要集成测试（手动测试）

describe('FBXImporter.validateFile', () => {
  const importer = new FBXImporter();

  it('passes for valid .fbx file under 500MB', () => {
    const file = new File(['content'], 'model.fbx', {
      type: 'application/octet-stream',
    });
    expect(() => importer.validateFile(file)).not.toThrow();
  });

  it('passes for uppercase .FBX extension', () => {
    const file = new File(['content'], 'model.FBX', {
      type: 'application/octet-stream',
    });
    expect(() => importer.validateFile(file)).not.toThrow();
  });

  it('throws for non-fbx file', () => {
    const file = new File(['content'], 'model.glb', {
      type: 'model/gltf-binary',
    });
    expect(() => importer.validateFile(file)).toThrow('仅支持 FBX 格式文件');
  });

  it('throws for empty file', () => {
    const file = new File([], 'model.fbx', {
      type: 'application/octet-stream',
    });
    expect(() => importer.validateFile(file)).toThrow('文件为空');
  });

  it('throws for file exceeding 500MB', () => {
    // 创建超大文件（只改 size 属性，不实际分配内存）
    const largeFile = {
      name: 'huge.fbx',
      size: 501 * 1024 * 1024,
      type: 'application/octet-stream',
    } as File;
    expect(() => importer.validateFile(largeFile)).toThrow('文件过大');
  });
});
