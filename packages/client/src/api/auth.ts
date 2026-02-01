import { apiClient } from '../config/api.js';
import type {
  UserLoginRequest,
  UserRegisterRequest,
  LoginResponse,
  RegisterResponse,
  AuthCheckResponse,
} from '@digittwinedit/shared';

export const authApi = {
  // 注册
  async register(data: UserRegisterRequest): Promise<RegisterResponse> {
    return apiClient.post('/auth/register', data);
  },

  // 登录
  async login(data: UserLoginRequest): Promise<LoginResponse> {
    return apiClient.post('/auth/login', data);
  },

  // 登出
  async logout(): Promise<void> {
    return apiClient.post('/auth/logout');
  },

  // 获取当前用户
  async getMe(): Promise<AuthCheckResponse> {
    return apiClient.get('/auth/me');
  },

  // 检查认证状态
  async checkAuth(): Promise<AuthCheckResponse> {
    return apiClient.get('/auth/check');
  },
};
