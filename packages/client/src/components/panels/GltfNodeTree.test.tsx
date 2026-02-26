import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { GltfNodeTree } from './GltfNodeTree';
import { useAssetStore } from '../../stores/assetStore';
import { useEditorStore } from '../../stores/editorStore';

// vi.hoisted 保证 mockLoadFn 在 vi.mock 工厂函数执行前可用
const mockLoadFn = vi.hoisted(() => vi.fn());

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setWithCredentials = vi.fn();
    load = mockLoadFn;
  },
}));

vi.mock('../../api/assets.js', () => ({
  assetsApi: {
    getAssetDownloadUrl: (id: number) => `/api/assets/${id}/dl`,
  },
}));

function makeMockScene(meshName: string) {
  const scene = new THREE.Object3D();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  mesh.name = meshName;
  scene.add(mesh);
  return scene;
}

const ASSET = {
  id: 5,
  name: 'robot.glb',
  type: 'model' as const,
  file_path: '/uploads/robot.glb',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('GltfNodeTree', () => {
  beforeEach(() => {
    mockLoadFn.mockReset();
    useAssetStore.setState({ assets: [ASSET] } as any);
    useEditorStore.setState({ activeSubNodePath: null, selectedIds: [], activeId: null } as any);
  });

  it('shows loading state before GLTF arrives', () => {
    // load callback never fires
    mockLoadFn.mockImplementation(() => {});
    render(<GltfNodeTree sceneObjectId="obj-1" assetId={5} depth={0} />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders node name after GLTF loads', async () => {
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('Torso') });
    });
    render(<GltfNodeTree sceneObjectId="obj-1" assetId={5} depth={0} />);
    expect(await screen.findByText('Torso')).toBeInTheDocument();
  });

  it('renders multiple nodes at root level', async () => {
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      const scene = new THREE.Object3D();
      ['Head', 'Body', 'LeftArm'].forEach((name) => {
        const m = new THREE.Mesh();
        m.name = name;
        scene.add(m);
      });
      onLoad({ scene });
    });
    render(<GltfNodeTree sceneObjectId="obj-1" assetId={5} depth={0} />);
    await waitFor(() => {
      expect(screen.getByText('Head')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
      expect(screen.getByText('LeftArm')).toBeInTheDocument();
    });
  });

  it('clicking node sets activeSubNodePath and selects parent scene object', async () => {
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('WheelFR') });
    });
    render(<GltfNodeTree sceneObjectId="car-obj" assetId={5} depth={0} />);
    const nodeEl = await screen.findByText('WheelFR');
    // GltfNodeItem 的行是含 'hierarchy-item' class 的 div
    const row = nodeEl.closest('div[class]')!;
    fireEvent.click(row);
    expect(useEditorStore.getState().activeSubNodePath).toBe('WheelFR');
    expect(useEditorStore.getState().selectedIds).toContain('car-obj');
  });

  it('clicking different nodes updates activeSubNodePath', async () => {
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      const scene = new THREE.Object3D();
      ['A', 'B'].forEach((n) => {
        const m = new THREE.Mesh(); m.name = n; scene.add(m);
      });
      onLoad({ scene });
    });
    render(<GltfNodeTree sceneObjectId="obj-1" assetId={5} depth={0} />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());

    fireEvent.click(screen.getByText('A').closest('div[class]')!);
    expect(useEditorStore.getState().activeSubNodePath).toBe('A');

    fireEvent.click(screen.getByText('B').closest('div[class]')!);
    expect(useEditorStore.getState().activeSubNodePath).toBe('B');
  });
});
