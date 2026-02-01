import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { useAuthStore } from '../../../stores/authStore';
import { useProjectStore } from '../../../stores/projectStore';

// Mock stores
vi.mock('../../../stores/authStore');
vi.mock('../../../stores/projectStore');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  const mockProjects = [
    { id: 1, name: 'Project 1', created_at: '2024-01-01', updated_at: '2024-01-01' },
    { id: 2, name: 'Project 2', created_at: '2024-01-01', updated_at: '2024-01-01' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (useAuthStore as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: vi.fn(),
    });

    (useProjectStore as any).mockReturnValue({
      projects: mockProjects,
      loadProjects: vi.fn(),
      isLoading: false,
    });
  });

  it('should render login page', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Digital Twin Editor')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('should display project list', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('should show empty state when no projects', () => {
    (useProjectStore as any).mockReturnValue({
      projects: [],
      loadProjects: vi.fn(),
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create Your First Project')).toBeInTheDocument();
  });

  it('should allow selecting a project', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const projectCard = screen.getByText('Project 1').closest('button');
    await user.click(projectCard!);

    // Check if project is highlighted (has blue border class)
    expect(projectCard).toHaveClass('border-blue-500');
  });

  it('should open register dialog', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const registerButton = screen.getByText(/Don't have an account/);
    await user.click(registerButton);

    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('should load projects on mount', () => {
    const mockLoadProjects = vi.fn();

    (useProjectStore as any).mockReturnValue({
      projects: [],
      loadProjects: mockLoadProjects,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(mockLoadProjects).toHaveBeenCalled();
  });
});
