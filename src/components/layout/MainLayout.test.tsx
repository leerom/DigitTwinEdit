import { render, screen } from '@testing-library/react';
import { MainLayout } from './MainLayout';
import { describe, it, expect, vi } from 'vitest';

// Mock the layout store to control visibility during tests
vi.mock('../../stores/layoutStore', () => ({
  useLayoutStore: () => ({
    sidebarLeftVisible: true,
    sidebarRightVisible: true,
    bottomPanelVisible: true,
    sidebarLeftWidth: 200,
    sidebarRightWidth: 200,
    bottomPanelHeight: 150,
  }),
}));

describe('MainLayout', () => {
  it('renders all layout areas correctly', () => {
    render(
      <MainLayout
        header={<div data-testid="header">Header</div>}
        leftPanel={<div data-testid="left">Left</div>}
        centerPanel={<div data-testid="center">Center</div>}
        rightPanel={<div data-testid="right">Right</div>}
        bottomPanel={<div data-testid="bottom">Bottom</div>}
      />
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
    expect(screen.getByTestId('bottom')).toBeInTheDocument();
  });

  it('applies dark theme classes', () => {
     const { container } = render(
      <MainLayout
        header={<div />}
        leftPanel={<div />}
        centerPanel={<div />}
        rightPanel={<div />}
        bottomPanel={<div />}
      />
    );

    // Check for root dark theme classes
    expect(container.firstChild).toHaveClass('bg-bg-dark');
    expect(container.firstChild).toHaveClass('text-slate-300');
  });
});
