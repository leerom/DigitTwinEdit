import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FBXImportDialog } from '../FBXImportDialog';
import { DEFAULT_FBX_IMPORT_SETTINGS } from '../types';

describe('FBXImportDialog', () => {
  const defaultProps = {
    isOpen: true,
    fileName: 'building.fbx',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title and file name', () => {
    render(<FBXImportDialog {...defaultProps} />);
    expect(screen.getByText('导入 FBX 模型')).toBeInTheDocument();
    expect(screen.getByText('building.fbx')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<FBXImportDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('导入 FBX 模型')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button clicked', () => {
    render(<FBXImportDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });

  it('calls onConfirm with default settings when import clicked without changes', () => {
    render(<FBXImportDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '导入' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(DEFAULT_FBX_IMPORT_SETTINGS);
  });

  it('disables normalsMode select when normals is "import"', () => {
    render(<FBXImportDialog {...defaultProps} />);
    // 默认 normals 是 'import'，所以法线模式应该是 disabled
    const normalsModeSelect = screen.getByDisplayValue('面积和顶角加权');
    expect(normalsModeSelect).toBeDisabled();
  });

  it('enables normalsMode select when normals is changed to "calculate"', () => {
    render(<FBXImportDialog {...defaultProps} />);
    const normalsSelect = screen.getByDisplayValue('导入法线');
    fireEvent.change(normalsSelect, { target: { value: 'calculate' } });
    const normalsModeSelect = screen.getByDisplayValue('面积和顶角加权');
    expect(normalsModeSelect).not.toBeDisabled();
  });

  it('calls onConfirm with updated settings when user changes scale', () => {
    render(<FBXImportDialog {...defaultProps} />);
    const scaleInput = screen.getByRole('spinbutton');
    fireEvent.change(scaleInput, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: '导入' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ scale: 2 })
    );
  });
});
