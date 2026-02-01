import { create } from 'zustand';
import { authApi } from '../api/auth.js';
import type { UserResponse } from '@digittwinedit/shared';

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username, password, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ username, password, rememberMe });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  register: async (username, password, email) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register({ username, password, email });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
      // 即使出错也清除本地状态
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const response = await authApi.checkAuth();
      set({
        user: response.user,
        isAuthenticated: response.authenticated,
        isLoading: false,
      });
    } catch (error) {
      console.error('Check auth error:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
