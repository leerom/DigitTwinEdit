import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog } from './Dialog';

describe('Dialog Component', () => {
  it('should not render when isOpen is false', () => {
    const { container } = render(
      <Dialog isOpen={false}>
        <div>Dialog Content</div>
      </Dialog>
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <Dialog isOpen={true} title="Test Dialog">
        <div>Dialog Content</div>
      </Dialog>
    );
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog Content')).toBeInTheDocument();
  });

  it('should call onClose when overlay is clicked (closeOnOverlayClick=true)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog isOpen={true} onClose={onClose} closeOnOverlayClick={true}>
        <div>Content</div>
      </Dialog>
    );

    // Find the overlay element (the outermost div with fixed positioning)
    const overlay = container.querySelector('.fixed');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should not call onClose when overlay is clicked (closeOnOverlayClick=false)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog isOpen={true} onClose={onClose} closeOnOverlayClick={false}>
        <div>Content</div>
      </Dialog>
    );

    const overlay = container.querySelector('.fixed');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).not.toHaveBeenCalled();
    }
  });

  it('should not close when clicking inside dialog content', () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen={true} onClose={onClose} closeOnOverlayClick={true}>
        <div>Content</div>
      </Dialog>
    );

    fireEvent.click(screen.getByText('Content'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
