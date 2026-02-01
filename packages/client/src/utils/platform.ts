// src/utils/platform.ts

/**
 * 检测是否为 Mac 平台
 */
export const isMac = /Mac/.test(navigator.platform);

/**
 * 检测是否为 Windows 平台
 */
export const isWindows = /Win/.test(navigator.platform);

/**
 * 获取平台对应的修饰键
 * Mac: metaKey (Command)
 * Windows/Linux: ctrlKey
 */
export const getModifierKey = (e: KeyboardEvent | MouseEvent): boolean => {
  return isMac ? e.metaKey : e.ctrlKey;
};

/**
 * 获取 Alt 键状态 (Mac 上是 Option)
 */
export const getAltKey = (e: KeyboardEvent | MouseEvent): boolean => {
  return e.altKey;
};

/**
 * 获取 Shift 键状态
 */
export const getShiftKey = (e: KeyboardEvent | MouseEvent): boolean => {
  return e.shiftKey;
};

/**
 * 格式化快捷键标签用于显示
 * 例如: "Ctrl+KeyD" -> "⌘D" (Mac) 或 "Ctrl+D" (Windows)
 */
export const getShortcutLabel = (shortcut: string): string => {
  let label = shortcut;

  if (isMac) {
    label = label
      .replace('Ctrl+', '⌘')
      .replace('Alt+', '⌥')
      .replace('Shift+', '⇧');
  } else {
    label = label.replace('Ctrl+', 'Ctrl+').replace('Alt+', 'Alt+');
  }

  // 移除 "Key" 前缀
  label = label.replace(/Key([A-Z])/g, '$1');

  return label;
};

/**
 * 从键盘事件构建快捷键字符串
 * 例如: Ctrl+KeyD, Shift+KeyF
 */
export const buildShortcutKey = (e: KeyboardEvent): string => {
  const parts: string[] = [];

  if (getModifierKey(e)) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  parts.push(e.code);

  return parts.join('+');
};

/**
 * 获取修饰键状态对象
 */
export const getModifiers = (e: KeyboardEvent | MouseEvent) => ({
  ctrl: getModifierKey(e),
  shift: e.shiftKey,
  alt: e.altKey,
});
