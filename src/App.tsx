import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { SceneView } from '@/components/viewport/SceneView';

import { HierarchyPanel } from '@/components/panels/HierarchyPanel';
import { ProjectPanel } from '@/components/panels/ProjectPanel';
import { InspectorPanel } from '@/components/panels/InspectorPanel';
import { ProgressDialog } from '@/features/scene/components/ProgressDialog';
import { useSceneStore } from '@/stores/sceneStore';

// Hooks temporarily disabled during cleanup
// import { useSelectionSync } from '@/features/editor/hooks/useSelectionSync';
// import { useToolShortcuts } from '@/features/editor/hooks/useToolShortcuts';
// import { useGlobalShortcuts } from '@/features/editor/hooks/useGlobalShortcuts';

function App() {
  // useSelectionSync();
  // useToolShortcuts();
  // useGlobalShortcuts();

  const importProgress = useSceneStore((state) => state.importProgress);

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

export default App;
