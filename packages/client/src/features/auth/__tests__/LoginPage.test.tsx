import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { useAuthStore } from '../../../stores/authStore';

vi.mock('../../../stores/authStore');

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/projects" element={<div>项目列表页</div>} />
      </Routes>
    </MemoryRouter>
  );
}

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
    renderLoginPage();

    expect(screen.getByText('数字孪生编辑器')).toBeInTheDocument();
    expect(screen.getByText('用户名')).toBeInTheDocument();
  });

  it('should display feature highlights', () => {
    renderLoginPage();

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

    renderLoginPage();

    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should open register dialog', async () => {
    const user = userEvent.setup();

    renderLoginPage();

    const registerButton = screen.getByText('还没有账号？立即注册');
    await user.click(registerButton);

    expect(screen.getByText('创建账号')).toBeInTheDocument();
  });

  it('should redirect when authenticated without render-phase navigation warning', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (useAuthStore as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
    });

    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByText('项目列表页')).toBeInTheDocument();
    });

    expect(
      consoleErrorSpy.mock.calls.some((call) =>
        call.some(
          (arg) =>
            typeof arg === 'string' &&
            arg.includes('You should call navigate() in a React.useEffect()')
        )
      )
    ).toBe(false);

    consoleErrorSpy.mockRestore();
  });
});
