// src/features/editor/shortcuts/KeyboardShortcutManager.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { KeyboardShortcutManager } from './KeyboardShortcutManager';
import { useEditorStore } from '@/stores/editorStore';

describe('KeyboardShortcutManager', () => {
  beforeEach(() => {
    cleanup();
    useEditorStore.getState().setActiveTool('hand');
    useEditorStore.getState().clearSelection();
  });

  it('should render without errors', () => {
    const { container } = render(<KeyboardShortcutManager />);
    expect(container).toBeTruthy();
  });

  it('should switch tool on Q key press', () => {
    render(<KeyboardShortcutManager />);

    const event = new KeyboardEvent('keydown', {
      code: 'KeyQ',
      bubbles: true,
    });

    window.dispatchEvent(event);

    expect(useEditorStore.getState().activeTool).toBe('hand');
  });

  it('should switch tool on W key press', () => {
    render(<KeyboardShortcutManager />);

    const event = new KeyboardEvent('keydown', {
      code: 'KeyW',
      bubbles: true,
    });

    window.dispatchEvent(event);

    expect(useEditorStore.getState().activeTool).toBe('translate');
  });

  it('should ignore shortcuts when input is focused', () => {
    render(<KeyboardShortcutManager />);

    // Create and focus an input element
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      code: 'KeyE',
      bubbles: true,
    });

    window.dispatchEvent(event);

    // Tool should not change from 'hand'
    expect(useEditorStore.getState().activeTool).toBe('hand');

    document.body.removeChild(input);
  });
});
