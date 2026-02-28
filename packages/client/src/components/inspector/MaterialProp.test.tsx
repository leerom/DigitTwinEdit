import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaterialProp } from './MaterialProp';
import { useSceneStore } from '@/stores/sceneStore';

vi.mock('@/stores/sceneStore', () => ({
  useSceneStore: vi.fn(),
}));

vi.mock('@/stores/historyStore', () => ({
  useHistoryStore: {
    getState: () => ({ execute: vi.fn() }),
  },
}));

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: (selector: any) => selector({ currentScene: { project_id: 1 } }),
}));

vi.mock('./TexturePicker', () => ({
  TexturePicker: ({ label }: any) => <div data-testid="texture-picker">{label}</div>,
}));

function setupStore(materialType: string, props: Record<string, unknown> = {}) {
  (useSceneStore as any).mockImplementation((selector: any) => {
    const state = {
      scene: {
        objects: {
          obj1: {
            id: 'obj1',
            type: 'MESH',
            components: {
              mesh: {
                material: { type: materialType, props },
              },
            },
          },
        },
      },
    };
    return selector(state);
  });
}

describe('MaterialProp', () => {
  beforeEach(() => {
    setupStore('MeshStandardMaterial', { color: '#ff0000' });
  });

  it('shows material type selector', () => {
    render(<MaterialProp objectId="obj1" />);
    expect(screen.getByText(/MeshStandardMaterial/i)).toBeInTheDocument();
  });

  it('MeshStandardMaterial 渲染 emissive、flatShading 字段', () => {
    setupStore('MeshStandardMaterial', {});
    render(<MaterialProp objectId="obj1" />);
    // 展开 base 分组（默认不折叠）
    expect(screen.getByText('自发光颜色')).toBeTruthy();
    expect(screen.getByText('平面着色')).toBeTruthy();
  });

  it('MeshPhysicalMaterial 额外渲染 physical 分组标题', () => {
    setupStore('MeshPhysicalMaterial', {});
    render(<MaterialProp objectId="obj1" />);
    expect(screen.getByText(/物理高级/)).toBeTruthy();
  });

  it('贴图 group 默认折叠，点击展开后显示 TexturePicker', () => {
    setupStore('MeshStandardMaterial', {});
    render(<MaterialProp objectId="obj1" />);
    // 初始 maps 分组折叠，不显示贴图选择器
    expect(screen.queryAllByTestId('texture-picker')).toHaveLength(0);
    // 点击"贴图 (Maps)"分组标题展开
    const mapsBtn = screen.getByText(/贴图 \(Maps\)/);
    fireEvent.click(mapsBtn);
    // 展开后应出现 TexturePicker
    const pickers = screen.queryAllByTestId('texture-picker');
    expect(pickers.length).toBeGreaterThan(0);
  });
});
