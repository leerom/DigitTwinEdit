import { describe, it, expect } from 'vitest';
import { TextureConverter } from '../TextureConverter';

describe('TextureConverter.validateFile', () => {
  const converter = new TextureConverter();

  it('passes for JPEG file', () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    expect(() => converter.validateFile(file)).not.toThrow();
  });

  it('passes for PNG file', () => {
    const file = new File(['data'], 'texture.png', { type: 'image/png' });
    expect(() => converter.validateFile(file)).not.toThrow();
  });

  it('passes for uppercase extension', () => {
    const file = new File(['data'], 'texture.PNG', { type: 'image/png' });
    expect(() => converter.validateFile(file)).not.toThrow();
  });

  it('throws for unsupported format (.webp)', () => {
    const file = new File(['data'], 'texture.webp', { type: 'image/webp' });
    expect(() => converter.validateFile(file)).toThrow('仅支持 JPG/PNG 格式');
  });

  it('throws for model file (.fbx)', () => {
    const file = new File(['data'], 'model.fbx', { type: 'application/octet-stream' });
    expect(() => converter.validateFile(file)).toThrow('仅支持 JPG/PNG 格式');
  });

  it('throws for empty file', () => {
    const file = new File([], 'texture.jpg', { type: 'image/jpeg' });
    expect(() => converter.validateFile(file)).toThrow('文件为空');
  });

  it('throws for file exceeding 50MB', () => {
    const bigFile = Object.defineProperty(
      new File(['x'], 'large.jpg', { type: 'image/jpeg' }),
      'size',
      { value: 51 * 1024 * 1024 }
    );
    expect(() => converter.validateFile(bigFile)).toThrow('文件过大');
  });
});
