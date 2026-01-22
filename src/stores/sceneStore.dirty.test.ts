import { useSceneStore } from './sceneStore';
import { act } from '@testing-library/react';

describe('SceneStore Dirty State', () => {
  beforeEach(() => {
    useSceneStore.setState(useSceneStore.getInitialState());
  });

  test('should track dirty state', () => {
    const store = useSceneStore.getState();
    expect(store.isDirty).toBe(false);

    act(() => {
      store.markDirty();
    });
    expect(useSceneStore.getState().isDirty).toBe(true);

    act(() => {
      store.markClean();
    });
    expect(useSceneStore.getState().isDirty).toBe(false);
  });

  test('addObject should mark scene as dirty', () => {
    act(() => {
      useSceneStore.getState().addObject({});
    });
    expect(useSceneStore.getState().isDirty).toBe(true);
  });
});
