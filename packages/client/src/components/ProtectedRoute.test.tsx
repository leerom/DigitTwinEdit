import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    checkAuth: vi.fn(),
  },
}));

function renderProtectedRoute(initialPath = '/editor/2') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/editor/:projectId"
          element={
            <ProtectedRoute>
              <div>Editor Page</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('waits for auth check before redirecting authenticated users', async () => {
    vi.mocked(authApi.checkAuth).mockResolvedValue({
      authenticated: true,
      user: {
        id: 1,
        username: 'leerom',
        email: 'leerom@example.com',
      },
    } as any);

    renderProtectedRoute();

    await waitFor(() => {
      expect(screen.getByText('Editor Page')).toBeInTheDocument();
    });

    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
