import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContextMenu } from './ContextMenu';

describe('ContextMenu', () => {
  it('should render menu items at specified position', () => {
    const items = [
      { label: '打开', icon: 'folder_open', onClick: vi.fn() },
      { label: '删除', icon: 'delete', onClick: vi.fn(), danger: true },
    ];

    render(
      <ContextMenu
        items={items}
        position={{ x: 100, y: 200 }}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('打开')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
  });

  it('should call onClick when menu item is clicked', () => {
    const handleClick = vi.fn();
    const items = [{ label: '打开', onClick: handleClick }];

    render(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('打开'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking outside', () => {
    const handleClose = vi.fn();
    const items = [{ label: '打开', onClick: vi.fn() }];

    render(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        onClose={handleClose}
      />
    );

    fireEvent.mouseDown(document.body);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when pressing ESC key', () => {
    const handleClose = vi.fn();
    const items = [{ label: '打开', onClick: vi.fn() }];

    render(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        onClose={handleClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should apply danger styling to danger items', () => {
    const items = [{ label: '删除', onClick: vi.fn(), danger: true }];

    render(
      <ContextMenu
        items={items}
        position={{ x: 0, y: 0 }}
        onClose={vi.fn()}
      />
    );

    const deleteButton = screen.getByText('删除').closest('button');
    expect(deleteButton).toHaveClass('text-red-400');
  });
});
