import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useSceneStore } from '../../stores/sceneStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { Header } from '../../components/layout/Header';
import { HierarchyPanel } from '../../components/panels/HierarchyPanel';
import { SceneView } from '../../components/viewport/SceneView';
import { InspectorPanel } from '../../components/panels/InspectorPanel';
import { ProjectPanel } from '../../components/panels/ProjectPanel';
import { ProgressDialog } from '../scene/components/ProgressDialog';
import { useAutoSave } from '../scene/hooks/useAutoSave';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, loadProject, loadActiveScene, isLoading: projectLoading } = useProjectStore();
  const { importProgress } = useSceneStore();

  // 加载项目和场景
  useEffect(() => {
    if (projectId) {
      const id = parseInt(projectId, 10);
      loadProject(id)
        .then(() => loadActiveScene(id))
        .catch(console.error);
    }
  }, [projectId, loadProject, loadActiveScene]);

  // 自动保存
  useAutoSave();

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading project...</div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Project not found</div>
      </div>
    );
  }

  return (
    <>
      <MainLayout
        header={<Header />}
        leftPanel={<HierarchyPanel />}
        centerPanel={<SceneView />}
        rightPanel={<InspectorPanel />}
        bottomPanel={<ProjectPanel />}
      />

      {/* Global Progress Dialog */}
      <ProgressDialog
        isOpen={importProgress.isImporting}
        onClose={() => {}}
        title="导入场景"
        percentage={importProgress.percentage}
        currentTask={importProgress.currentTask}
      />
    </>
  );
}
