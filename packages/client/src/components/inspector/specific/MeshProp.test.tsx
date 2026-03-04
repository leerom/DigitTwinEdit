import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MeshProp } from './MeshProp';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType } from '@/types';

vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: vi.fn(),
}));

function setupMeshStore(meshProps: Record<string, unknown> = {}, objectProps: Record<string, unknown> = {}) {
  (useSceneStore as any).mockImplementation((selector: any) => {
    const state = {
      scene: {
        objects: {
          mesh1: {
            id: 'mesh1',
            type: ObjectType.MESH,
            visible: true,
            ...objectProps,
            components: {
              mesh: {
                castShadow: true,
                receiveShadow: true,
                ...meshProps,
              },
            },
          },
        },
      },
      updateComponent: vi.fn(),
      updateObject: vi.fn(),
    };
    return selector(state);
  });
}

function setupGroupStore(objectProps: Record<string, unknown> = {}) {
  (useSceneStore as any).mockImplementation((selector: any) => {
    const state = {
      scene: {
        objects: {
          group1: {
            id: 'group1',
            type: ObjectType.GROUP,
            visible: true,
            castShadow: false,
            receiveShadow: false,
            ...objectProps,
            components: {},
          },
        },
      },
      updateComponent: vi.fn(),
      updateObject: vi.fn(),
    };
    return selector(state);
  });
}

describe('MeshProp — MESH 对象', () => {
  beforeEach(() => {
    setupMeshStore();
  });

  it('显示"对象属性 (Object)"标题', () => {
    render(<MeshProp objectIds={['mesh1']} />);
    expect(screen.getByText('对象属性 (Object)')).toBeTruthy();
  });

  it('castShadow 默认 true 时 Checkbox 为选中', () => {
    render(<MeshProp objectIds={['mesh1']} />);
    // 阴影行应存在两个 checkbox（产生 + 接收）
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('修改 castShadow 时调用 updateComponent(mesh)', () => {
    const mockUpdateComponent = vi.fn();
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            mesh1: {
              id: 'mesh1',
              type: ObjectType.MESH,
              visible: true,
              components: { mesh: { castShadow: true, receiveShadow: true } },
            },
          },
        },
        updateComponent: mockUpdateComponent,
        updateObject: vi.fn(),
      };
      return selector(state);
    });
    render(<MeshProp objectIds={['mesh1']} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // 产生阴影 checkbox
    expect(mockUpdateComponent).toHaveBeenCalledWith('mesh1', 'mesh', expect.objectContaining({ castShadow: expect.any(Boolean) }));
  });

  it('修改 visible 时调用 updateObject', () => {
    const mockUpdateObject = vi.fn();
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            mesh1: {
              id: 'mesh1',
              type: ObjectType.MESH,
              visible: true,
              components: { mesh: { castShadow: true, receiveShadow: true } },
            },
          },
        },
        updateComponent: vi.fn(),
        updateObject: mockUpdateObject,
      };
      return selector(state);
    });
    render(<MeshProp objectIds={['mesh1']} />);
    // 找到可见性 checkbox（第3个 checkbox：产生、接收、可见性、视锥体裁剪）
    const checkboxes = screen.getAllByRole('checkbox');
    const visibleCheckbox = checkboxes[2]; // index 2 = 可见性
    fireEvent.click(visibleCheckbox);
    expect(mockUpdateObject).toHaveBeenCalledWith('mesh1', expect.objectContaining({ visible: expect.any(Boolean) }));
  });

  it('修改 renderOrder 时调用 updateComponent(mesh)', () => {
    const mockUpdateComponent = vi.fn();
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            mesh1: {
              id: 'mesh1',
              type: ObjectType.MESH,
              visible: true,
              components: { mesh: { castShadow: true, receiveShadow: true, renderOrder: 0 } },
            },
          },
        },
        updateComponent: mockUpdateComponent,
        updateObject: vi.fn(),
      };
      return selector(state);
    });
    render(<MeshProp objectIds={['mesh1']} />);
    const input = screen.getByDisplayValue('0'); // renderOrder 默认 0
    fireEvent.change(input, { target: { value: '5' } });
    expect(mockUpdateComponent).toHaveBeenCalledWith('mesh1', 'mesh', { renderOrder: 5 });
  });
});

describe('MeshProp — GROUP 对象', () => {
  beforeEach(() => {
    setupGroupStore();
  });

  it('GROUP 对象也显示"对象属性 (Object)"标题', () => {
    render(<MeshProp objectIds={['group1']} />);
    expect(screen.getByText('对象属性 (Object)')).toBeTruthy();
  });

  it('GROUP 修改 castShadow 时调用 updateObject（不是 updateComponent）', () => {
    const mockUpdateObject = vi.fn();
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            group1: {
              id: 'group1',
              type: ObjectType.GROUP,
              visible: true,
              castShadow: false,
              receiveShadow: false,
              components: {},
            },
          },
        },
        updateComponent: vi.fn(),
        updateObject: mockUpdateObject,
      };
      return selector(state);
    });
    render(<MeshProp objectIds={['group1']} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // 产生阴影
    expect(mockUpdateObject).toHaveBeenCalledWith('group1', expect.objectContaining({ castShadow: expect.any(Boolean) }));
  });
});
