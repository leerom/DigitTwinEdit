import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { SubNodeInspector } from './SubNodeInspector';
import { useEditorStore } from '../../stores/editorStore';
import { useSceneStore } from '../../stores/sceneStore';
import { useAssetStore } from '../../stores/assetStore';
import { ObjectType } from '../../types';

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

const ASSET_ID = 10;
const OBJ_ID = 'mesh-abc';

function makeMockScene(meshName: string, pos = new THREE.Vector3(0, 0, 0)) {
  const scene = new THREE.Object3D();
  const mat = new THREE.MeshStandardMaterial();
  (mat as any).name = 'Mat_0';
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), mat);
  mesh.name = meshName;
  mesh.position.copy(pos);
  scene.add(mesh);
  return scene;
}

const MOCK_SCENE_STATE = {
  id: 's1',
  name: 'Scene',
  version: '1',
  createdAt: '',
  updatedAt: '',
  root: 'root',
  objects: {
    root: {
      id: 'root',
      name: 'Root',
      type: ObjectType.GROUP,
      parentId: null,
      children: [OBJ_ID],
      visible: true,
      locked: false,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    },
    [OBJ_ID]: {
      id: OBJ_ID,
      name: 'Robot',
      type: ObjectType.MESH,
      parentId: 'root',
      children: [],
      visible: true,
      locked: false,
      transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      components: { model: { assetId: ASSET_ID, path: '/uploads/robot.glb' } },
    },
  },
  assets: {},
  settings: { environment: '', gridVisible: true, backgroundColor: '' },
} as any;

describe('SubNodeInspector', () => {
  beforeEach(() => {
    mockLoadFn.mockReset();
    useEditorStore.setState({
      activeId: OBJ_ID,
      activeSubNodePath: null,
      selectedIds: [OBJ_ID],
    } as any);
    useSceneStore.setState({ scene: MOCK_SCENE_STATE } as any);
    useAssetStore.setState({
      assets: [
        {
          id: ASSET_ID,
          name: 'robot.glb',
          type: 'model',
          file_path: '/uploads/robot.glb',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ],
    } as any);
  });

  it('renders nothing when activeSubNodePath is null', () => {
    const { container } = render(<SubNodeInspector />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when activeId is null', () => {
    useEditorStore.setState({ activeId: null, activeSubNodePath: 'SomeMesh' } as any);
    const { container } = render(<SubNodeInspector />);
    expect(container.firstChild).toBeNull();
  });

  it('shows transform section after GLTF loads', async () => {
    useEditorStore.setState({ activeSubNodePath: 'BoxMesh' } as any);
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('BoxMesh') });
    });
    render(<SubNodeInspector />);
    await waitFor(() => {
      expect(screen.getByText('子节点变换 (Transform)')).toBeInTheDocument();
    });
  });

  it('shows node name in header after GLTF loads', async () => {
    useEditorStore.setState({ activeSubNodePath: 'Spine_01' } as any);
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('Spine_01') });
    });
    render(<SubNodeInspector />);
    await waitFor(() => {
      // 节点名称来自路径末段，可能同时出现在标题和路径行中
      const matches = screen.getAllByText('Spine_01');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('persists position X change without conversion', async () => {
    useEditorStore.setState({ activeSubNodePath: 'BoxMesh' } as any);
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('BoxMesh') });
    });
    render(<SubNodeInspector />);
    await waitFor(() => expect(screen.getByText('位置 P')).toBeInTheDocument());

    const posLabel = screen.getByText('位置 P');
    const posSection = posLabel.closest('div.flex')!;
    const posInputs = within(posSection).getAllByRole('textbox');

    // 修改 X 值为 7
    fireEvent.change(posInputs[0], { target: { value: '7' } });
    fireEvent.blur(posInputs[0]);

    await waitFor(() => {
      const model = (useSceneStore.getState().scene.objects[OBJ_ID].components as any)?.model;
      const posX = model?.nodeOverrides?.['BoxMesh']?.transform?.position?.[0];
      expect(posX).toBe(7);
    });
  });

  it('converts rotation degrees to radians when persisting', async () => {
    useEditorStore.setState({ activeSubNodePath: 'BoxMesh' } as any);
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('BoxMesh') });
    });
    render(<SubNodeInspector />);
    await waitFor(() => expect(screen.getByText('旋转 R')).toBeInTheDocument());

    const rotLabel = screen.getByText('旋转 R');
    const rotSection = rotLabel.closest('div.flex')!;
    const rotInputs = within(rotSection).getAllByRole('textbox');

    // 输入 90 度，期望存储 π/2 ≈ 1.5708 弧度
    fireEvent.change(rotInputs[0], { target: { value: '90' } });
    fireEvent.blur(rotInputs[0]);

    await waitFor(() => {
      const model = (useSceneStore.getState().scene.objects[OBJ_ID].components as any)?.model;
      const rotX = model?.nodeOverrides?.['BoxMesh']?.transform?.rotation?.[0];
      expect(rotX).toBeCloseTo(Math.PI / 2, 4);
    });
  });

  it('shows material section with editable roughness and metalness fields after GLTF loads', async () => {
    useEditorStore.setState({ activeSubNodePath: 'BoxMesh' } as any);
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('BoxMesh') });
    });
    render(<SubNodeInspector />);
    await waitFor(() => {
      expect(screen.getByText('材质 (Material)')).toBeInTheDocument();
      expect(screen.getByText('粗糙度')).toBeInTheDocument();
      expect(screen.getByText('金属感')).toBeInTheDocument();
      expect(screen.getByLabelText('颜色')).toBeInTheDocument();
    });
  });

  it('persists roughness change to nodeOverrides.material.props', async () => {
    useEditorStore.setState({ activeSubNodePath: 'BoxMesh' } as any);
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('BoxMesh') });
    });
    render(<SubNodeInspector />);
    await waitFor(() => expect(screen.getByText('粗糙度')).toBeInTheDocument());

    const roughnessLabel = screen.getByText('粗糙度');
    const roughnessRow = roughnessLabel.closest('div')!;
    const roughnessInput = within(roughnessRow).getByRole('spinbutton');

    fireEvent.change(roughnessInput, { target: { value: '0.5' } });
    fireEvent.blur(roughnessInput);

    await waitFor(() => {
      const model = (useSceneStore.getState().scene.objects[OBJ_ID].components as any)?.model;
      expect(model?.nodeOverrides?.['BoxMesh']?.material?.props?.roughness).toBe(0.5);
    });
  });

  it('persists metalness change to nodeOverrides.material.props', async () => {
    useEditorStore.setState({ activeSubNodePath: 'BoxMesh' } as any);
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('BoxMesh') });
    });
    render(<SubNodeInspector />);
    await waitFor(() => expect(screen.getByText('金属感')).toBeInTheDocument());

    const metalnessLabel = screen.getByText('金属感');
    const metalnessRow = metalnessLabel.closest('div')!;
    const metalnessInput = within(metalnessRow).getByRole('spinbutton');

    fireEvent.change(metalnessInput, { target: { value: '0.8' } });
    fireEvent.blur(metalnessInput);

    await waitFor(() => {
      const model = (useSceneStore.getState().scene.objects[OBJ_ID].components as any)?.model;
      expect(model?.nodeOverrides?.['BoxMesh']?.material?.props?.metalness).toBe(0.8);
    });
  });

  it('persists color change to nodeOverrides.material.props', async () => {
    useEditorStore.setState({ activeSubNodePath: 'BoxMesh' } as any);
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('BoxMesh') });
    });
    render(<SubNodeInspector />);
    await waitFor(() => expect(screen.getByLabelText('颜色')).toBeInTheDocument());

    const colorInput = screen.getByLabelText('颜色');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });

    await waitFor(() => {
      const model = (useSceneStore.getState().scene.objects[OBJ_ID].components as any)?.model;
      expect(model?.nodeOverrides?.['BoxMesh']?.material?.props?.color).toBe('#ff0000');
    });
  });

  it('preserves existing transform overrides when updating material prop', async () => {
    useEditorStore.setState({ activeSubNodePath: 'BoxMesh' } as any);
    useSceneStore.setState({
      scene: {
        ...MOCK_SCENE_STATE,
        objects: {
          ...MOCK_SCENE_STATE.objects,
          [OBJ_ID]: {
            ...MOCK_SCENE_STATE.objects[OBJ_ID],
            components: {
              model: {
                assetId: ASSET_ID,
                path: '/uploads/robot.glb',
                nodeOverrides: {
                  'BoxMesh': { transform: { position: [1, 2, 3] } },
                },
              },
            },
          },
        },
      },
    } as any);
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('BoxMesh') });
    });
    render(<SubNodeInspector />);
    await waitFor(() => expect(screen.getByText('粗糙度')).toBeInTheDocument());

    const roughnessLabel = screen.getByText('粗糙度');
    const roughnessRow = roughnessLabel.closest('div')!;
    const roughnessInput = within(roughnessRow).getByRole('spinbutton');
    fireEvent.change(roughnessInput, { target: { value: '0.3' } });
    fireEvent.blur(roughnessInput);

    await waitFor(() => {
      const model = (useSceneStore.getState().scene.objects[OBJ_ID].components as any)?.model;
      expect(model?.nodeOverrides?.['BoxMesh']?.material?.props?.roughness).toBe(0.3);
      expect(model?.nodeOverrides?.['BoxMesh']?.transform?.position?.[0]).toBe(1);
    });
  });

  it('preserves existing nodeOverrides for other paths when updating', async () => {
    // 预设已有 other-node 的覆盖
    useEditorStore.setState({ activeSubNodePath: 'BoxMesh' } as any);
    useSceneStore.setState({
      scene: {
        ...MOCK_SCENE_STATE,
        objects: {
          ...MOCK_SCENE_STATE.objects,
          [OBJ_ID]: {
            ...MOCK_SCENE_STATE.objects[OBJ_ID],
            components: {
              model: {
                assetId: ASSET_ID,
                path: '/uploads/robot.glb',
                nodeOverrides: {
                  'other-node': { transform: { position: [5, 5, 5] } },
                },
              },
            },
          },
        },
      },
    } as any);
    mockLoadFn.mockImplementation((_url: string, onLoad: Function) => {
      onLoad({ scene: makeMockScene('BoxMesh') });
    });
    render(<SubNodeInspector />);
    await waitFor(() => expect(screen.getByText('位置 P')).toBeInTheDocument());

    const posLabel = screen.getByText('位置 P');
    const posSection = posLabel.closest('div.flex')!;
    const posInputs = within(posSection).getAllByRole('textbox');
    fireEvent.change(posInputs[0], { target: { value: '3' } });
    fireEvent.blur(posInputs[0]);

    await waitFor(() => {
      const model = (useSceneStore.getState().scene.objects[OBJ_ID].components as any)?.model;
      // 新路径覆盖存在
      expect(model?.nodeOverrides?.['BoxMesh']?.transform?.position?.[0]).toBe(3);
      // 旧路径覆盖保留
      expect(model?.nodeOverrides?.['other-node']?.transform?.position?.[0]).toBe(5);
    });
  });
});
