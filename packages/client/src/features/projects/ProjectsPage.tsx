import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FolderPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { ProjectCard } from '../auth/components/ProjectCard';
import { CreateProjectDialog } from '../auth/components/CreateProjectDialog';
import type { ProjectResponse } from '@digittwinedit/shared';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { projects, loadProjects, isLoading } = useProjectStore();

  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);

  // 加载项目列表
  useEffect(() => {
    loadProjects().catch(console.error);
  }, [loadProjects]);

  // 当用户选择项目时跳转到编辑器
  useEffect(() => {
    if (selectedProject) {
      navigate(`/editor/${selectedProject.id}`);
    }
  }, [selectedProject, navigate]);

  const handleProjectSelect = (project: ProjectResponse) => {
    setSelectedProject(project);
  };

  const handleCreateSuccess = async (project?: ProjectResponse) => {
    await loadProjects();
    // 创建成功后立即打开编辑器
    if (project) {
      navigate(`/editor/${project.id}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* 顶部栏 */}
      <header className="bg-gray-800 border-b border-gray-700 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">数字孪生编辑器</h1>
            <p className="text-sm text-gray-400 mt-1">
              欢迎回来，{user?.username}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            登出
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* 项目列表标题 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">我的项目</h2>
              <p className="text-sm text-gray-400 mt-1">
                选择一个项目开始编辑，或创建新项目
              </p>
            </div>
            <button
              onClick={() => setShowCreateProject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FolderPlus size={18} />
              创建新项目
            </button>
          </div>

          {/* 项目网格 */}
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isSelected={selectedProject?.id === project.id}
                  onSelect={handleProjectSelect}
                />
              ))}
            </div>
          ) : (
            /* 空状态 */
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-800 mb-4">
                <FolderPlus size={40} className="text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                还没有项目
              </h3>
              <p className="text-gray-500 mb-6">
                创建您的第一个项目开始使用数字孪生编辑器
              </p>
              <button
                onClick={() => setShowCreateProject(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                创建第一个项目
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 创建项目对话框 */}
      {showCreateProject && (
        <CreateProjectDialog
          onClose={() => setShowCreateProject(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
