import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { KeyboardShortcutManager } from './KeyboardShortcutManager';
import { useEditorStore } from '@/stores/editorStore';
import { useInputState } from '@/features/editor/navigation/useInputState';
import { buildShortcutKey } from '@/utils/platform';

// Mock dependencies
vi.mock('@/utils/platform', () => ({
  buildShortcutKey: vi.fn(),
  isMac: false,
}));

// Helper to simulate key event
const triggerKeyDown = (code: string, modifiers = {}) => {
  const event = new KeyboardEvent('keydown', {
    code,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  window.dispatchEvent(event);
  return event;
};

describe('KeyboardShortcutManager', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useEditorStore.setState({
      activeTool: 'hand',
      selectedIds: [],
      navigationMode: 'orbit',
      viewMode: '3D',
    } as any);
    useInputState.setState({ keys: {} });

    // Default mock implementation
    (buildShortcutKey as any).mockImplementation((e: KeyboardEvent) => e.code);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should ignore input when focus is on input element', () => {
    render(<KeyboardShortcutManager />);

    // Mock input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = triggerKeyDown('KeyW');

    expect(useEditorStore.getState().activeTool).toBe('hand'); // Should not change

    document.body.removeChild(input);
  });

  it('should switch tool in orbit mode', async () => {
    render(<KeyboardShortcutManager />);

    (buildShortcutKey as any).mockReturnValue('KeyW');
    triggerKeyDown('KeyW');

    // KeyboardShortcutManager 内部通过动态 import('./executeShortcut') 异步执行。
    // 在测试环境里给它更充足时间避免偶发超时。
    await waitFor(() => {
      expect(useEditorStore.getState().activeTool).toBe('translate');
    }, { timeout: 5000 });
  });

  it('should update input state in fly mode', () => {
    useEditorStore.setState({ navigationMode: 'fly' } as any);
    render(<KeyboardShortcutManager />);

    (buildShortcutKey as any).mockReturnValue('KeyW');
    const event = triggerKeyDown('KeyW');

    // Should NOT switch tool
    expect(useEditorStore.getState().activeTool).toBe('hand');

    // Should update input state
    expect(useInputState.getState().keys['KeyW']).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('should handle keyup in fly mode', () => {
    useEditorStore.setState({ navigationMode: 'fly' } as any);
    useInputState.setState({ keys: { 'KeyW': true } });
    render(<KeyboardShortcutManager />);

    const event = new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true });
    window.dispatchEvent(event);

    expect(useInputState.getState().keys['KeyW']).toBe(false);
  });
});
