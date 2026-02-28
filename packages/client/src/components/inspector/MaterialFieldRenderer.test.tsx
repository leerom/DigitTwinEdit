import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MaterialFieldRenderer } from './MaterialFieldRenderer';
import type { MaterialFieldDef } from '@/features/materials/materialSchema';

// mock TexturePicker
vi.mock('./TexturePicker', () => ({
  TexturePicker: ({ label }: { label: string }) => <div>{label}</div>,
}));

const mockProjectId = 1;

describe('MaterialFieldRenderer', () => {
  it('number 类型渲染 NumberInput', () => {
    const field: MaterialFieldDef = {
      key: 'roughness', type: 'number', group: 'pbr', label: '粗糙度', min: 0, max: 1, step: 0.01
    };
    render(
      <MaterialFieldRenderer
        field={field}
        value={0.5}
        onChange={vi.fn()}
        projectId={mockProjectId}
      />
    );
    expect(screen.getByText('粗糙度')).toBeTruthy();
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('0.5');
  });

  it('color 类型渲染颜色选择器', () => {
    const field: MaterialFieldDef = {
      key: 'emissive', type: 'color', group: 'base', label: '自发光颜色'
    };
    const { container } = render(
      <MaterialFieldRenderer
        field={field}
        value="#ff0000"
        onChange={vi.fn()}
        projectId={mockProjectId}
      />
    );
    expect(screen.getByText('自发光颜色')).toBeTruthy();
    expect(container.querySelector('input[type="color"]')).toBeTruthy();
  });

  it('boolean 类型渲染 Checkbox', () => {
    const field: MaterialFieldDef = {
      key: 'flatShading', type: 'boolean', group: 'base', label: '平面着色'
    };
    render(
      <MaterialFieldRenderer
        field={field}
        value={false}
        onChange={vi.fn()}
        projectId={mockProjectId}
      />
    );
    expect(screen.getByText('平面着色')).toBeTruthy();
    expect(screen.getByRole('checkbox')).toBeTruthy();
  });

  it('texture 类型渲染 TexturePicker', () => {
    const field: MaterialFieldDef = {
      key: 'map', type: 'texture', group: 'maps', label: '漫反射贴图'
    };
    render(
      <MaterialFieldRenderer
        field={field}
        value={null}
        onChange={vi.fn()}
        projectId={mockProjectId}
      />
    );
    expect(screen.getByText('漫反射贴图')).toBeTruthy();
  });

  it('vector2 类型渲染 Vector2Field', () => {
    const field: MaterialFieldDef = {
      key: 'normalScale', type: 'vector2', group: 'pbr', label: '法线缩放', step: 0.01
    };
    render(
      <MaterialFieldRenderer
        field={field}
        value={[1, 1]}
        onChange={vi.fn()}
        projectId={mockProjectId}
      />
    );
    expect(screen.getByText('法线缩放')).toBeTruthy();
    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs.length).toBe(2);
  });
});
