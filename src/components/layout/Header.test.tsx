import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { describe, it, expect, vi } from 'vitest';

// Mock store actions
const toggleSidebarLeft = vi.fn();
const toggleSidebarRight = vi.fn();
const toggleBottomPanel = vi.fn();

vi.mock('../../stores/layoutStore', () => ({
  useLayoutStore: () => ({
    sidebarLeftVisible: true,
    sidebarRightVisible: true,
    bottomPanelVisible: true,
    toggleSidebarLeft,
    toggleSidebarRight,
    toggleBottomPanel,
  }),
}));

describe('Header', () => {
  it('renders menu items', () => {
    render(<Header />);
    expect(screen.getByText('场景')).toBeInTheDocument();
    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.getByText('窗口')).toBeInTheDocument();
  });
});
