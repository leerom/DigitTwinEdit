import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Axios instance with credentials
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 重要: 携带cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 处理错误响应
    if (error.response?.status === 401) {
      // 未认证 - 可以触发登出或跳转到登录页
      console.error('未授权 - 请登录');
    }

    const errorMessage = error.response?.data?.message || error.message || '发生错误';
    return Promise.reject(new Error(errorMessage));
  }
);
