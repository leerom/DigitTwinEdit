import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';
import { useSceneStore } from '../../stores/sceneStore';
import { useAssetStore } from '../../stores/assetStore';
import { useMaterialStore } from '../../stores/materialStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { Header } from '../../components/layout/Header';
import { HierarchyPanel } from '../../components/panels/HierarchyPanel';
import { SceneView } from '../../components/viewport/SceneView';
import { InspectorPanel } from '../../components/panels/InspectorPanel';
import { ProjectPanel } from '../../components/panels/ProjectPanel';
import { ProgressDialog } from '../scene/components/ProgressDialog';
import { useAutoSave } from '../scene/hooks/useAutoSave';
import { NodeMaterialEditor } from '../nodeMaterial/NodeMaterialEditor';

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject, loadProject, loadActiveScene, isLoading: projectLoading } = useProjectStore();
  const { importProgress } = useSceneStore();
  const { loadAssets } = useAssetStore();
  const { loadMaterials } = useMaterialStore();
  const nodeEditorMaterialId = useMaterialStore((s) => s.nodeEditorMaterialId);

  // 加载项目、场景和资产列表
  useEffect(() => {
    if (projectId) {
      const id = parseInt(projectId, 10);
      loadProject(id)
        .then(() => Promise.all([
          loadActiveScene(id),
          loadAssets(id),
          loadMaterials(id),
        ]))
        .catch(console.error);
    }
  }, [projectId, loadProject, loadActiveScene, loadAssets, loadMaterials]);

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

      {/* NodeMaterial 节点编辑器 Overlay */}
      {nodeEditorMaterialId !== null && <NodeMaterialEditor />}
    </>
  );
}
