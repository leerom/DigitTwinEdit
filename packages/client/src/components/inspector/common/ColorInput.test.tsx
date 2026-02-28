import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ColorInput } from './ColorInput';

describe('ColorInput', () => {
  it('渲染 label 和颜色值', () => {
    const { getByText } = render(
      <ColorInput label="自发光颜色" value="#ff0000" onChange={vi.fn()} />
    );
    expect(getByText('自发光颜色')).toBeTruthy();
    expect(getByText('#ff0000')).toBeTruthy();
  });

  it('color input 改变时调用 onChange', () => {
    const onChange = vi.fn();
    const { container } = render(
      <ColorInput label="颜色" value="#ffffff" onChange={onChange} />
    );
    const input = container.querySelector('input[type="color"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#aabbcc' } });
    expect(onChange).toHaveBeenCalledWith('#aabbcc');
  });
});
