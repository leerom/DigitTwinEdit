import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('MaterialProp', () => {
  beforeEach(() => {
    (useSceneStore as any).mockImplementation((selector: any) => {
      const state = {
        scene: {
          objects: {
            obj1: {
              id: 'obj1',
              type: 'MESH',
              components: {
                mesh: {
                  material: { type: 'MeshStandardMaterial', props: { color: '#ff0000' } },
                },
              },
            },
          },
        },
      };
      return selector(state);
    });
  });

  it('shows material type selector', () => {
    render(<MaterialProp objectId="obj1" />);
    expect(screen.getByText(/MeshStandardMaterial/i)).toBeInTheDocument();
  });
});
