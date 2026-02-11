import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useProjectStore } from './projectStore';
import { sceneApi } from '../services/api/sceneApi';

vi.mock('../services/api/sceneApi');

describe('projectStore - scene operations', () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentProject: {
        id: 1,
        name: 'Test Project',
        description: '',
        owner_id: 1,
        thumbnail: null,
        created_at: '',
        updated_at: '',
        scenes: [
          { id: 1, name: 'Scene 1', is_active: true, updated_at: '' },
          { id: 2, name: 'Scene 2', is_active: false, updated_at: '' },
        ],
      },
      scenes: [
        { id: 1, name: 'Scene 1', is_active: true, updated_at: '' },
        { id: 2, name: 'Scene 2', is_active: false, updated_at: '' },
      ],
      currentScene: null,
      currentSceneId: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should activate scene', async () => {
    const mockResponse = {
      scene: {
        id: 2,
        project_id: 1,
        name: 'Scene 2',
        is_active: true,
        data: {},
        created_at: '',
        updated_at: '',
      },
    };
    vi.mocked(sceneApi.activateScene).mockResolvedValue(mockResponse);

    await useProjectStore.getState().activateScene(1, 2);

    expect(sceneApi.activateScene).toHaveBeenCalledWith(1, 2);

    const state = useProjectStore.getState();
    expect(state.scenes.find((s) => s.id === 1)?.is_active).toBe(false);
    expect(state.scenes.find((s) => s.id === 2)?.is_active).toBe(true);
  });

  it('should update scene metadata', async () => {
    const mockResponse = {
      scene: {
        id: 1,
        project_id: 1,
        name: 'Updated Scene',
        is_active: true,
        data: {},
        created_at: '',
        updated_at: '',
      },
    };
    vi.mocked(sceneApi.updateScene).mockResolvedValue(mockResponse);

    await useProjectStore.getState().updateSceneMetadata(1, { name: 'Updated Scene' });

    expect(sceneApi.updateScene).toHaveBeenCalledWith(1, 1, { name: 'Updated Scene' });

    const state = useProjectStore.getState();
    expect(state.scenes.find((s) => s.id === 1)?.name).toBe('Updated Scene');
  });
});
