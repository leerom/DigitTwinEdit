import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FBXImporter, generateUniqueName } from '../FBXImporter';

// 只测试可以单元测试的部分：validateFile 和 generateUniqueName
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

describe('generateUniqueName', () => {
  it('returns the name unchanged when no conflict', () => {
    const existing = new Set(['other.fbx']);
    expect(generateUniqueName('building.fbx', existing)).toBe('building.fbx');
  });

  it('returns name unchanged when existing set is empty', () => {
    expect(generateUniqueName('building.fbx', new Set())).toBe('building.fbx');
  });

  it('appends (1) when exact name conflicts', () => {
    const existing = new Set(['building.fbx']);
    expect(generateUniqueName('building.fbx', existing)).toBe('building (1).fbx');
  });

  it('increments counter when (1) also conflicts', () => {
    const existing = new Set(['building.fbx', 'building (1).fbx']);
    expect(generateUniqueName('building.fbx', existing)).toBe('building (2).fbx');
  });

  it('finds first free slot in a series of conflicts', () => {
    const existing = new Set([
      'building.fbx',
      'building (1).fbx',
      'building (2).fbx',
      'building (3).fbx',
    ]);
    expect(generateUniqueName('building.fbx', existing)).toBe('building (4).fbx');
  });

  it('handles files with no extension', () => {
    const existing = new Set(['model']);
    expect(generateUniqueName('model', existing)).toBe('model (1)');
  });

  it('handles dotfiles (extension is the full name)', () => {
    // "." is at index 0 → base is empty string, ext is ".hidden"
    const existing = new Set(['.hidden']);
    expect(generateUniqueName('.hidden', existing)).toBe(' (1).hidden');
  });

  it('preserves extension correctly for .glb files', () => {
    const existing = new Set(['scene.glb']);
    expect(generateUniqueName('scene.glb', existing)).toBe('scene (1).glb');
  });
});
