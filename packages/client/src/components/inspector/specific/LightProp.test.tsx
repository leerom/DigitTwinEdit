import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LightProp } from './LightProp';
import { useSceneStore } from '@/stores/sceneStore';
import { ObjectType } from '@/types';

vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: vi.fn(),
}));

function setupStore(lightProps: Record<string, unknown> = {}) {
  (useSceneStore as any).mockImplementation((selector: any) => {
    const state = {
      scene: {
        objects: {
          light1: {
            id: 'light1',
            type: ObjectType.LIGHT,
            components: {
              light: {
                color: '#ffffff',
                intensity: 1,
                type: 'directional',
                castShadow: false,
                ...lightProps,
              },
            },
          },
        },
      },
      updateComponent: vi.fn(),
    };
    return selector(state);
  });
}

describe('LightProp — 直射光阴影设置', () => {
  beforeEach(() => {
    setupStore();
  });

  it('castShadow=false 时不显示阴影设置区', () => {
    render(<LightProp objectIds={['light1']} />);
    expect(screen.queryByText('阴影设置 (Shadow)')).toBeNull();
  });

  it('castShadow=true 时显示阴影设置区', () => {
    setupStore({ castShadow: true });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.getByText('阴影设置 (Shadow)')).toBeTruthy();
  });

  it('阴影设置区包含所有必要字段标签', () => {
    setupStore({ castShadow: true });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.getByText('Camera Size')).toBeTruthy();
    expect(screen.getByText('Near')).toBeTruthy();
    expect(screen.getByText('Far')).toBeTruthy();
    expect(screen.getByText('Map Resolution')).toBeTruthy();
    expect(screen.getByText('Bias')).toBeTruthy();
    expect(screen.getByText('Normal Bias')).toBeTruthy();
    expect(screen.getByText('Radius')).toBeTruthy();
  });

  it('非直射光不显示阴影设置区（即使 castShadow=true）', () => {
    setupStore({ type: 'point', castShadow: true });
    render(<LightProp objectIds={['light1']} />);
    expect(screen.queryByText('阴影设置 (Shadow)')).toBeNull();
  });

  it('修改 Camera Size 时调用 updateComponent', () => {
    const mockUpdateComponent = vi.fn();
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            light1: {
              id: 'light1',
              type: ObjectType.LIGHT,
              components: {
                light: { color: '#ffffff', intensity: 1, type: 'directional', castShadow: true },
              },
            },
          },
        },
        updateComponent: mockUpdateComponent,
      };
      return selector(state);
    });
    render(<LightProp objectIds={['light1']} />);
    const input = screen.getByDisplayValue('10'); // Camera Size 默认值
    fireEvent.change(input, { target: { value: '20' } });
    expect(mockUpdateComponent).toHaveBeenCalledWith('light1', 'light', { shadowCameraSize: 20 });
  });
});
