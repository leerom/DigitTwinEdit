import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ProjectsPage } from '../ProjectsPage';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';

// Mock stores
vi.mock('@/stores/authStore');
vi.mock('@/stores/projectStore');

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 默认的 auth store 状态
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      logout: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    } as any);
  });

  it('应该显示项目选择界面，即使只有一个项目', async () => {
    const mockLoadProjects = vi.fn().mockResolvedValue(undefined);

    // Mock project store 返回一个项目
    vi.mocked(useProjectStore).mockReturnValue({
      projects: [
        {
          id: 1,
          name: '测试项目',
          description: '唯一的项目',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      loadProjects: mockLoadProjects,
      isLoading: false,
    } as any);

    render(
      <BrowserRouter>
        <ProjectsPage />
      </BrowserRouter>
    );

    // 等待加载项目
    await waitFor(() => {
      expect(mockLoadProjects).toHaveBeenCalled();
    });

    // 验证不会自动跳转到编辑器
    expect(mockNavigate).not.toHaveBeenCalledWith('/editor/1');

    // 验证显示项目列表
    expect(screen.getByText('我的项目')).toBeInTheDocument();
    expect(screen.getByText('测试项目')).toBeInTheDocument();
  });

  it('应该显示空状态当没有项目时', async () => {
    const mockLoadProjects = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useProjectStore).mockReturnValue({
      projects: [],
      loadProjects: mockLoadProjects,
      isLoading: false,
    } as any);

    render(
      <BrowserRouter>
        <ProjectsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockLoadProjects).toHaveBeenCalled();
    });

    expect(screen.getByText('还没有项目')).toBeInTheDocument();
    expect(screen.getByText('创建第一个项目')).toBeInTheDocument();
  });

  it('应该显示多个项目', async () => {
    const mockLoadProjects = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useProjectStore).mockReturnValue({
      projects: [
        {
          id: 1,
          name: '项目 1',
          description: '第一个项目',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: '项目 2',
          description: '第二个项目',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      loadProjects: mockLoadProjects,
      isLoading: false,
    } as any);

    render(
      <BrowserRouter>
        <ProjectsPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockLoadProjects).toHaveBeenCalled();
    });

    expect(screen.getByText('项目 1')).toBeInTheDocument();
    expect(screen.getByText('项目 2')).toBeInTheDocument();
  });
});
