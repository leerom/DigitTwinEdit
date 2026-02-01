import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import { ProjectCard } from './components/ProjectCard';
import { LoginForm } from './components/LoginForm';
import { RegisterDialog } from './components/RegisterDialog';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import type { ProjectResponse } from '@digittwinedit/shared';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { projects, loadProjects, isLoading: projectsLoading } = useProjectStore();

  const [selectedProject, setSelectedProject] = useState<ProjectResponse | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);

  // 加载项目列表
  useEffect(() => {
    loadProjects().catch(console.error);
  }, [loadProjects]);

  // 如果已登录，跳转到编辑器
  useEffect(() => {
    if (isAuthenticated && selectedProject) {
      navigate(`/editor/${selectedProject.id}`);
    }
  }, [isAuthenticated, selectedProject, navigate]);

  const handleProjectSelect = (project: ProjectResponse) => {
    setSelectedProject(project);
  };

  const handleLoginSuccess = () => {
    if (selectedProject) {
      navigate(`/editor/${selectedProject.id}`);
    }
  };

  if (authLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* 左侧 - 项目列表 */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">
            Digital Twin Editor
          </h1>
          <p className="text-gray-400 mb-8">
            Select a project to get started
          </p>

          {/* 项目网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isSelected={selectedProject?.id === project.id}
                onSelect={handleProjectSelect}
              />
            ))}
          </div>

          {/* 空状态 */}
          {projects.length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-500 mb-4">No projects yet</div>
              <button
                onClick={() => setShowCreateProject(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Project
              </button>
            </div>
          )}

          {/* 底部操作 */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800">
            <button
              onClick={() => setShowCreateProject(true)}
              className="px-4 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + New Project
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="px-4 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Don't have an account? Register
            </button>
          </div>
        </div>
      </div>

      {/* 右侧 - 登录表单 */}
      <div className="w-96 bg-gray-800 p-8 flex items-center justify-center">
        <LoginForm
          selectedProject={selectedProject}
          onSuccess={handleLoginSuccess}
        />
      </div>

      {/* 注册对话框 */}
      {showRegister && (
        <RegisterDialog onClose={() => setShowRegister(false)} />
      )}

      {/* 创建项目对话框 */}
      {showCreateProject && (
        <CreateProjectDialog
          onClose={() => setShowCreateProject(false)}
          onSuccess={() => loadProjects()}
        />
      )}
    </div>
  );
}
