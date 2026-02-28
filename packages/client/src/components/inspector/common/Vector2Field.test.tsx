import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Vector2Field } from './Vector2Field';

describe('Vector2Field', () => {
  it('渲染 label 和两个输入框', () => {
    const { getByText, getAllByRole } = render(
      <Vector2Field label="法线缩放" value={[1, 2]} onChange={vi.fn()} step="0.01" />
    );
    expect(getByText('法线缩放')).toBeTruthy();
    const inputs = getAllByRole('spinbutton');
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('1');
    expect((inputs[1] as HTMLInputElement).value).toBe('2');
  });

  it('修改 X 值时 onChange 接收 [newX, oldY]', () => {
    const onChange = vi.fn();
    const { getAllByRole } = render(
      <Vector2Field label="法线缩放" value={[1, 2]} onChange={onChange} step="0.01" />
    );
    const inputs = getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '0.5' } });
    fireEvent.blur(inputs[0]);
    expect(onChange).toHaveBeenCalledWith([0.5, 2]);
  });

  it('修改 Y 值时 onChange 接收 [oldX, newY]', () => {
    const onChange = vi.fn();
    const { getAllByRole } = render(
      <Vector2Field label="法线缩放" value={[1, 2]} onChange={onChange} step="0.01" />
    );
    const inputs = getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '3' } });
    fireEvent.blur(inputs[1]);
    expect(onChange).toHaveBeenCalledWith([1, 3]);
  });
});
