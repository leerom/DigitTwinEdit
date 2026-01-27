import { render, screen } from '@testing-library/react';
import { ViewportOverlay } from './ViewportOverlay';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../stores/editorStore', () => ({
  useEditorStore: () => ({
    mode: 'select',
    renderMode: 'shaded',
    setMode: vi.fn(),
    setRenderMode: vi.fn(),
  }),
}));

describe('ViewportOverlay', () => {
  it('renders and has correct pointer events', () => {
    const { container } = render(<ViewportOverlay />);

    // The overlay container must be pointer-events-none to let clicks pass through to 3D canvas
    expect(container.firstChild).toHaveClass('pointer-events-none');

    // But buttons inside must be pointer-events-auto
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveClass('pointer-events-auto');
  });

  it('renders tool buttons', () => {
    render(<ViewportOverlay />);

    // title 文案已本地化为中文（见 ViewportOverlay.tsx）
    expect(screen.getByTitle(/抓手工具/)).toBeInTheDocument();
    expect(screen.getByTitle(/移动工具/)).toBeInTheDocument();
    expect(screen.getByTitle(/旋转工具/)).toBeInTheDocument();
    expect(screen.getByTitle(/缩放工具/)).toBeInTheDocument();
  });
});
