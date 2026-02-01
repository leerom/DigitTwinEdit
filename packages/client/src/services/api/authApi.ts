import { apiClient } from '../../config/api';
import type { UserLoginRequest, UserRegisterRequest, UserResponse, LoginResponse, RegisterResponse } from '@digittwinedit/shared';

export const authApi = {
  // 注册
  register: async (data: UserRegisterRequest): Promise<RegisterResponse> => {
    return apiClient.post('/auth/register', data);
  },

  // 登录
  login: async (data: UserLoginRequest): Promise<LoginResponse> => {
    return apiClient.post('/auth/login', data);
  },

  // 登出
  logout: async (): Promise<{ success: boolean; message: string }> => {
    return apiClient.post('/auth/logout');
  },

  // 获取当前用户
  me: async (): Promise<{ success: boolean; user: UserResponse }> => {
    return apiClient.get('/auth/me');
  },
};
