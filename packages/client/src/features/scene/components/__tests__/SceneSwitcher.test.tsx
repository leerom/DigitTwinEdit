import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SceneSwitcher } from '../SceneSwitcher';
import { useProjectStore } from '../../../../stores/projectStore';

// Mock store
vi.mock('../../../../stores/projectStore');

describe('SceneSwitcher', () => {
  const mockScenes = [
    { id: 1, name: 'Scene 1', is_active: true, updated_at: '2024-01-01' },
    { id: 2, name: 'Scene 2', is_active: false, updated_at: '2024-01-02' },
  ];

  const mockCurrentScene = {
    id: '1',
    name: 'Scene 1',
    version: '1.0.0',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    root: 'root',
    objects: {},
    assets: {},
    settings: { environment: 'default', gridVisible: true, backgroundColor: '#000' },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useProjectStore as any).mockReturnValue({
      scenes: mockScenes,
      currentScene: mockCurrentScene,
      currentSceneId: 1,
      switchScene: vi.fn().mockResolvedValue(undefined),
      createScene: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('should render current scene name', () => {
    render(<SceneSwitcher />);

    expect(screen.getByText('Scene 1')).toBeInTheDocument();
  });

  it('should show dropdown when clicked', async () => {
    const user = userEvent.setup();

    render(<SceneSwitcher />);

    const trigger = screen.getByText('Scene 1');
    await user.click(trigger);

    // Should show all scenes in dropdown
    const sceneOptions = screen.getAllByText(/Scene \d/);
    expect(sceneOptions.length).toBeGreaterThan(1);
  });

  it('should display all scenes in dropdown', async () => {
    const user = userEvent.setup();

    render(<SceneSwitcher />);

    const trigger = screen.getByText('Scene 1');
    await user.click(trigger);

    expect(screen.getByText('Scene 2')).toBeInTheDocument();
    expect(screen.getByText('New Scene')).toBeInTheDocument();
  });

  it('should mark active scene with check icon', async () => {
    const user = userEvent.setup();

    render(<SceneSwitcher />);

    const trigger = screen.getByText('Scene 1');
    await user.click(trigger);

    // Active scene should have a check icon
    const scene1Button = screen.getAllByRole('button').find(
      (btn) => btn.textContent?.includes('Scene 1')
    );

    // Check icon should be present (lucide-react Check component)
    const checkIcon = scene1Button?.querySelector('svg');
    expect(checkIcon).toBeInTheDocument();
  });

  it('should call switchScene when selecting different scene', async () => {
    const user = userEvent.setup();
    const mockSwitchScene = vi.fn().mockResolvedValue(undefined);

    (useProjectStore as any).mockReturnValue({
      scenes: mockScenes,
      currentScene: mockCurrentScene,
      currentSceneId: 1,
      switchScene: mockSwitchScene,
      createScene: vi.fn(),
    });

    render(<SceneSwitcher />);

    // Open dropdown
    const trigger = screen.getByText('Scene 1');
    await user.click(trigger);

    // Click on Scene 2
    const scene2Buttons = screen.getAllByRole('button');
    const scene2Button = scene2Buttons.find(btn => btn.textContent === 'Scene 2');
    await user.click(scene2Button!);

    expect(mockSwitchScene).toHaveBeenCalledWith(2);
  });

  it('should show create scene input when clicking New Scene', async () => {
    const user = userEvent.setup();

    render(<SceneSwitcher />);

    // Open dropdown
    const trigger = screen.getByText('Scene 1');
    await user.click(trigger);

    // Click New Scene
    const newSceneButton = screen.getByText('New Scene');
    await user.click(newSceneButton);

    // Should show input
    const input = screen.getByPlaceholderText('Scene name...');
    expect(input).toBeInTheDocument();
  });

  it('should create new scene', async () => {
    const user = userEvent.setup();
    const mockCreateScene = vi.fn().mockResolvedValue(undefined);

    (useProjectStore as any).mockReturnValue({
      scenes: mockScenes,
      currentScene: mockCurrentScene,
      currentSceneId: 1,
      switchScene: vi.fn(),
      createScene: mockCreateScene,
    });

    render(<SceneSwitcher />);

    // Open dropdown and click New Scene
    await user.click(screen.getByText('Scene 1'));
    await user.click(screen.getByText('New Scene'));

    // Type scene name
    const input = screen.getByPlaceholderText('Scene name...');
    await user.type(input, 'New Test Scene');

    // Click Create button
    const createButton = screen.getByText('Create');
    await user.click(createButton);

    expect(mockCreateScene).toHaveBeenCalledWith('New Test Scene');
  });
});
