import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { useAuthStore } from '../../../stores/authStore';

// Mock stores
vi.mock('../../../stores/authStore');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useAuthStore as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: vi.fn(),
    });
  });

  it('should render login page', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('数字孪生编辑器')).toBeInTheDocument();
    expect(screen.getByText('用户名')).toBeInTheDocument();
  });

  it('should display feature highlights', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('实时预览')).toBeInTheDocument();
    expect(screen.getByText('协作管理')).toBeInTheDocument();
    expect(screen.getByText('丰富组件')).toBeInTheDocument();
    expect(screen.getByText('云端保存')).toBeInTheDocument();
  });

  it('should show loading state when loading', () => {
    (useAuthStore as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      error: null,
      login: vi.fn(),
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should open register dialog', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const registerButton = screen.getByText('还没有账号？立即注册');
    await user.click(registerButton);

    expect(screen.getByText('创建账号')).toBeInTheDocument();
  });

  it('should redirect when authenticated', () => {
    (useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/projects', { replace: true });
  });
});
