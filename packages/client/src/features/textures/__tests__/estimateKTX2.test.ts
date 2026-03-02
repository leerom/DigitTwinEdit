import { describe, it, expect } from 'vitest';
import {
  nearestPOT,
  isPowerOfTwo,
  detectAlpha,
  estimateKTX2,
} from '../estimateKTX2';

// ─── nearestPOT ──────────────────────────────────────────────────────────────

describe('nearestPOT', () => {
  it('returns same value if already POT', () => {
    expect(nearestPOT(1024, 'nearest')).toBe(1024);
    expect(nearestPOT(512, 'ceil')).toBe(512);
    expect(nearestPOT(256, 'floor')).toBe(256);
  });

  it('nearest: rounds to closest power of two', () => {
    expect(nearestPOT(700, 'nearest')).toBe(512);  // closer to 512 than 1024
    expect(nearestPOT(800, 'nearest')).toBe(1024); // closer to 1024
    expect(nearestPOT(768, 'nearest')).toBe(1024); // exactly between → ceil
  });

  it('ceil: rounds up', () => {
    expect(nearestPOT(700, 'ceil')).toBe(1024);
    expect(nearestPOT(513, 'ceil')).toBe(1024);
  });

  it('floor: rounds down', () => {
    expect(nearestPOT(700, 'floor')).toBe(512);
    expect(nearestPOT(1023, 'floor')).toBe(512);
  });
});

// ─── isPowerOfTwo ─────────────────────────────────────────────────────────────

describe('isPowerOfTwo', () => {
  it('returns true for powers of two', () => {
    expect(isPowerOfTwo(1)).toBe(true);
    expect(isPowerOfTwo(64)).toBe(true);
    expect(isPowerOfTwo(1024)).toBe(true);
    expect(isPowerOfTwo(4096)).toBe(true);
  });

  it('returns false for non-powers of two', () => {
    expect(isPowerOfTwo(0)).toBe(false);
    expect(isPowerOfTwo(3)).toBe(false);
    expect(isPowerOfTwo(1000)).toBe(false);
    expect(isPowerOfTwo(1025)).toBe(false);
  });
});

// ─── detectAlpha ─────────────────────────────────────────────────────────────

describe('detectAlpha', () => {
  it('returns false when all pixels are fully opaque', () => {
    // 2 pixels: RGBA [255,0,0,255] and [0,255,0,255]
    const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
    expect(detectAlpha(data)).toBe(false);
  });

  it('returns true when any pixel has alpha < 255', () => {
    // Second pixel is semi-transparent
    const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128]);
    expect(detectAlpha(data)).toBe(true);
  });

  it('returns true for fully transparent pixel', () => {
    const data = new Uint8Array([255, 0, 0, 0]);
    expect(detectAlpha(data)).toBe(true);
  });

  it('returns false for empty buffer', () => {
    expect(detectAlpha(new Uint8Array(0))).toBe(false);
  });
});

// ─── estimateKTX2 ────────────────────────────────────────────────────────────

describe('estimateKTX2', () => {
  it('ETC1S without mipmaps: fileSizeBytes ≈ pixels/2 (1 bpp)', () => {
    const r = estimateKTX2({
      originalWidth: 1024, originalHeight: 1024,
      settings: { compressionMode: 'ETC1S', generateMipmaps: false, quality: 255,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    // 1024*1024 = 1M pixels, ETC1S 1bpp = 128KB
    expect(r.fileSizeBytes).toBeCloseTo(1024 * 1024 * 1 / 8, -3); // ±4KB
    // VRAM: ETC1S→ETC2 = 0.5 bytes/pixel, no mip → 1024*1024*0.5 = 512KB
    expect(r.vramBytes).toBeCloseTo(1024 * 1024 * 0.5, -3);
  });

  it('ETC1S with mipmaps: sizes scale by 4/3', () => {
    const noMip = estimateKTX2({
      originalWidth: 512, originalHeight: 512,
      settings: { compressionMode: 'ETC1S', generateMipmaps: false, quality: 200,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    const withMip = estimateKTX2({
      originalWidth: 512, originalHeight: 512,
      settings: { compressionMode: 'ETC1S', generateMipmaps: true, quality: 200,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    expect(withMip.vramBytes).toBeGreaterThan(noMip.vramBytes);
    expect(withMip.vramBytes).toBeCloseTo(noMip.vramBytes * (4 / 3), -2);
  });

  it('UASTC produces larger files than ETC1S', () => {
    const etc1s = estimateKTX2({
      originalWidth: 512, originalHeight: 512,
      settings: { compressionMode: 'ETC1S', generateMipmaps: false, quality: 200,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    const uastc = estimateKTX2({
      originalWidth: 512, originalHeight: 512,
      settings: { compressionMode: 'UASTC', generateMipmaps: false, quality: 200,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    expect(uastc.fileSizeBytes).toBeGreaterThan(etc1s.fileSizeBytes);
  });

  it('POT resize: reports scaled dimensions when potResize=true', () => {
    const r = estimateKTX2({
      originalWidth: 700, originalHeight: 500,
      settings: { compressionMode: 'ETC1S', generateMipmaps: false, quality: 200,
                  potResize: true, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    expect(r.targetWidth).toBe(512);  // nearestPOT(700) = 512
    expect(r.targetHeight).toBe(512); // nearestPOT(500) = 512
  });

  it('no POT resize: target dims equal original dims', () => {
    const r = estimateKTX2({
      originalWidth: 700, originalHeight: 500,
      settings: { compressionMode: 'ETC1S', generateMipmaps: false, quality: 200,
                  potResize: false, potMode: 'nearest', hasAlpha: false, colorSpace: 'sRGB' },
    });
    expect(r.targetWidth).toBe(700);
    expect(r.targetHeight).toBe(500);
  });
});
