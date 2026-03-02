import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextureImportDialog } from '../TextureImportDialog';
import { DEFAULT_TEXTURE_CONVERT_SETTINGS } from '../types';

const defaultProps = {
  isOpen: true,
  fileName: 'texture_albedo.jpg',
  fileSize: 1.4 * 1024 * 1024,       // 1.4 MB
  originalWidth: 1024,
  originalHeight: 1024,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('TextureImportDialog', () => {
  it('renders dialog title and file name', () => {
    render(<TextureImportDialog {...defaultProps} />);
    expect(screen.getByText('导入纹理（→KTX2）')).toBeInTheDocument();
    expect(screen.getByText(/texture_albedo\.jpg/)).toBeInTheDocument();
  });

  it('does not render when isOpen=false', () => {
    render(<TextureImportDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('导入纹理（→KTX2）')).not.toBeInTheDocument();
  });

  it('calls onCancel when 取消 button clicked', () => {
    render(<TextureImportDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });

  it('calls onConfirm with default settings when confirmed without changes', () => {
    render(<TextureImportDialog {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: '转换并上传' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(DEFAULT_TEXTURE_CONVERT_SETTINGS);
  });

  it('shows original dimensions in header', () => {
    render(<TextureImportDialog {...defaultProps} />);
    expect(screen.getByText(/1024\s*×\s*1024/)).toBeInTheDocument();
  });

  it('shows preview panel with 原始 and 转换后 sections', () => {
    render(<TextureImportDialog {...defaultProps} />);
    expect(screen.getByText(/原始/)).toBeInTheDocument();
    expect(screen.getByText(/转换后/)).toBeInTheDocument();
  });

  it('shows original file size in preview', () => {
    render(<TextureImportDialog {...defaultProps} />);
    // 1.4MB 应在预览区显示
    expect(screen.getByText(/1\.4\s*MB/i)).toBeInTheDocument();
  });

  it('confirms with quality=128 when quality slider changed', () => {
    render(<TextureImportDialog {...defaultProps} />);
    const qualityInput = screen.getByRole('spinbutton'); // number input
    fireEvent.change(qualityInput, { target: { value: '128' } });
    fireEvent.click(screen.getByRole('button', { name: '转换并上传' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ quality: 128 })
    );
  });

  it('confirms with colorSpace=Linear when 线性 selected', () => {
    render(<TextureImportDialog {...defaultProps} />);
    const select = screen.getByDisplayValue('sRGB');
    fireEvent.change(select, { target: { value: 'Linear' } });
    fireEvent.click(screen.getByRole('button', { name: '转换并上传' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ colorSpace: 'Linear' })
    );
  });

  it('POT resize toggle enables potMode selector', () => {
    render(<TextureImportDialog {...defaultProps} />);
    // 默认 potResize=false，potMode 选择器应被禁用
    const potModeSelect = screen.getByDisplayValue(/nearest|向下|向上/i);
    expect(potModeSelect).toBeDisabled();
    // 勾选 POT 后 potMode 可用
    const potCheckbox = screen.getByRole('checkbox', { name: /2 的幂次方/ });
    fireEvent.click(potCheckbox);
    expect(potModeSelect).not.toBeDisabled();
  });

  it('resets to default settings on cancel', () => {
    render(<TextureImportDialog {...defaultProps} />);
    const qualityInput = screen.getByRole('spinbutton');
    fireEvent.change(qualityInput, { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });
});
