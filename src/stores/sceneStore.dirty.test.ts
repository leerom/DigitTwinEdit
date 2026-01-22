import { useSceneStore } from './sceneStore';
import { act } from '@testing-library/react';

describe('SceneStore Dirty State', () => {
  const initialState = useSceneStore.getState();

  beforeEach(() => {
    useSceneStore.setState(initialState, true);
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

  test('removeObject should mark scene as dirty', () => {
    // Setup: Add object and clean store
    let objId = '';
    act(() => {
      useSceneStore.getState().addObject({ id: 'test-obj' });
      objId = 'test-obj';
      useSceneStore.getState().markClean();
    });

    act(() => {
      useSceneStore.getState().removeObject(objId);
    });
    expect(useSceneStore.getState().isDirty).toBe(true);
  });

  test('updateTransform should mark scene as dirty', () => {
    // Setup: Add object and clean store
    const objId = 'test-obj-transform';
    act(() => {
      useSceneStore.getState().addObject({ id: objId });
      useSceneStore.getState().markClean();
    });

    act(() => {
      useSceneStore.getState().updateTransform(objId, { position: [10, 10, 10] });
    });
    expect(useSceneStore.getState().isDirty).toBe(true);
  });

  test('reparentObject should mark scene as dirty', () => {
    // Setup: Add two objects and clean store
    const parentId = 'parent-obj';
    const childId = 'child-obj';
    act(() => {
      useSceneStore.getState().addObject({ id: parentId }); // defaults to root parent
      useSceneStore.getState().addObject({ id: childId }); // defaults to root parent
      useSceneStore.getState().markClean();
    });

    act(() => {
      useSceneStore.getState().reparentObject(childId, parentId);
    });
    expect(useSceneStore.getState().isDirty).toBe(true);
  });

  test('updateComponent should mark scene as dirty', () => {
    // Setup: Add object and clean store
    const objId = 'test-obj-component';
    act(() => {
      useSceneStore.getState().addObject({ id: objId });
      useSceneStore.getState().markClean();
    });

    act(() => {
      useSceneStore.getState().updateComponent(objId, 'testComponent', { value: 123 });
    });
    expect(useSceneStore.getState().isDirty).toBe(true);
  });
});
