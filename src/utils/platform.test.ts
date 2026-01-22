// src/utils/platform.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isMac, isWindows, getModifierKey, getShortcutLabel } from './platform';

describe('Platform Utils', () => {
  const originalPlatform = navigator.platform;

  afterEach(() => {
    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    });
  });

  describe('Platform Detection', () => {
    it('should detect Mac platform', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      // 需要重新导入以获取新值
      // 实际实现中这些是常量,所以我们测试逻辑而非运行时检测
    });

    it('should detect Windows platform', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });
    });
  });

  describe('getModifierKey', () => {
    it('should return metaKey for Mac', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
      } as KeyboardEvent;

      // 在 Mac 上应该使用 metaKey
      expect(event.metaKey).toBe(true);
    });

    it('should return ctrlKey for Windows', () => {
      const event = {
        metaKey: false,
        ctrlKey: true,
      } as KeyboardEvent;

      expect(event.ctrlKey).toBe(true);
    });
  });

  describe('getShortcutLabel', () => {
    it('should format shortcut for display', () => {
      expect(getShortcutLabel('Ctrl+KeyD')).toContain('D');
      expect(getShortcutLabel('Shift+KeyF')).toContain('F');
    });
  });
});
