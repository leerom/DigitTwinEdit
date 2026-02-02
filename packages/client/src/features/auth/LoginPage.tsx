import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { LoginForm } from './components/LoginForm';
import { RegisterDialog } from './components/RegisterDialog';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthStore();

  const [showRegister, setShowRegister] = useState(false);

  // 如果已登录，重定向到项目列表页
  if (isAuthenticated && !isLoading) {
    navigate('/projects', { replace: true });
    return null;
  }

  const handleLoginSuccess = () => {
    // 登录成功后跳转到项目列表页
    navigate('/projects');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* 左侧 - 欢迎信息 */}
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-white mb-4">
            数字孪生编辑器
          </h1>
          <p className="text-gray-400 mb-8">
            专业的三维场景编辑工具，轻松创建和管理您的数字孪生项目
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="text-blue-400 font-semibold mb-2">实时预览</div>
              <div className="text-sm text-gray-400">即时查看场景编辑效果</div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="text-blue-400 font-semibold mb-2">协作管理</div>
              <div className="text-sm text-gray-400">多项目同时管理</div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="text-blue-400 font-semibold mb-2">丰富组件</div>
              <div className="text-sm text-gray-400">相机、光源、网格等</div>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="text-blue-400 font-semibold mb-2">云端保存</div>
              <div className="text-sm text-gray-400">自动保存场景数据</div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧 - 登录表单 */}
      <div className="w-96 bg-gray-800 p-8 flex items-center justify-center">
        <LoginForm
          onSuccess={handleLoginSuccess}
          onShowRegister={() => setShowRegister(true)}
        />
      </div>

      {/* 注册对话框 */}
      {showRegister && (
        <RegisterDialog onClose={() => setShowRegister(false)} />
      )}
    </div>
  );
}
