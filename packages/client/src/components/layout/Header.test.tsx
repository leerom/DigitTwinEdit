import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './Header';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEditorStore } from '../../stores/editorStore';
import { useSceneStore } from '../../stores/sceneStore';
import { ObjectType } from '../../types';

// Mock store actions
const toggleSidebarLeft = vi.fn();
const toggleSidebarRight = vi.fn();
const toggleBottomPanel = vi.fn();

vi.mock('../../stores/layoutStore', () => ({
  useLayoutStore: () => ({
    sidebarLeftVisible: true,
    sidebarRightVisible: true,
    bottomPanelVisible: true,
    toggleSidebarLeft,
    toggleSidebarRight,
    toggleBottomPanel,
  }),
}));

describe('Header', () => {
  beforeEach(() => {
    useEditorStore.setState({ selectedIds: ['root'], activeId: 'root', activeTool: 'hand' });
    useSceneStore.setState({
      scene: {
        id: 'test-scene',
        name: 'test',
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
            children: [],
            visible: true,
            locked: true,
            transform: {
              position: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
          },
        },
        assets: {},
        settings: {
          environment: '',
          gridVisible: true,
          backgroundColor: '',
        },
      },
    });
  });

  it('renders menu items', () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
    expect(screen.getByText('场景')).toBeInTheDocument();
    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.getByText('窗口')).toBeInTheDocument();
  });

  it('adds cube and selects it with translate tool', () => {
    const beforeObjectIds = Object.keys(useSceneStore.getState().scene.objects);

    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('添加'));
    fireEvent.click(screen.getByText('立方体 (Cube)'));

    const afterObjects = useSceneStore.getState().scene.objects;
    const newIds = Object.keys(afterObjects).filter((id) => !beforeObjectIds.includes(id));

    expect(newIds).toHaveLength(1);
    expect(useEditorStore.getState().selectedIds).toEqual([newIds[0]]);
    expect(useEditorStore.getState().activeTool).toBe('translate');
    expect(afterObjects[newIds[0]]).toBeDefined();
  });
});
