import { useState } from 'react';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import type { ProjectResponse } from '@digittwinedit/shared';

interface LoginFormProps {
  selectedProject: ProjectResponse | null;
  onSuccess: () => void;
}

export function LoginForm({ selectedProject, onSuccess }: LoginFormProps) {
  const { login, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject) {
      alert('Please select a project first');
      return;
    }

    try {
      await login(username, password, rememberMe);
      onSuccess();
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl font-bold text-white mb-6">Sign In</h2>

      {selectedProject && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-gray-400">Selected project:</p>
          <p className="text-white font-medium">{selectedProject.name}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 用户名 */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            placeholder="Enter your username"
            autoFocus
            required
          />
        </div>

        {/* 密码 */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 pr-10"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* 记住我 */}
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="remember-me" className="ml-2 text-sm text-gray-300">
            Remember me
          </label>
        </div>

        {/* 错误消息 */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* 登录按钮 */}
        <button
          type="submit"
          disabled={!selectedProject || isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn size={20} />
              Sign In
            </>
          )}
        </button>
      </form>
    </div>
  );
}
