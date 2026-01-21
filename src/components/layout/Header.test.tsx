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
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Window')).toBeInTheDocument();
  });

  it('renders layout toggle buttons', () => {
    render(<Header />);
    // Check for icons using material symbols text
    expect(screen.getByText('side_navigation')).toBeInTheDocument();
    expect(screen.getByText('dock_to_bottom')).toBeInTheDocument();
    expect(screen.getByText('sidebar')).toBeInTheDocument();
  });

  it('calls store actions when toggles are clicked', () => {
    render(<Header />);

    fireEvent.click(screen.getByTitle('Toggle Hierarchy'));
    expect(toggleSidebarLeft).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Toggle Project Panel'));
    expect(toggleBottomPanel).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Toggle Inspector'));
    expect(toggleSidebarRight).toHaveBeenCalled();
  });
});
