import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { SceneView } from '@/components/viewport/SceneView';

import { HierarchyPanel } from '@/components/panels/HierarchyPanel';
import { ProjectPanel } from '@/components/panels/ProjectPanel';
import { InspectorPanel } from '@/components/panels/InspectorPanel';

// Hooks temporarily disabled during cleanup
// import { useSelectionSync } from '@/features/editor/hooks/useSelectionSync';
// import { useToolShortcuts } from '@/features/editor/hooks/useToolShortcuts';
// import { useGlobalShortcuts } from '@/features/editor/hooks/useGlobalShortcuts';

function App() {
  // useSelectionSync();
  // useToolShortcuts();
  // useGlobalShortcuts();

  return (
    <MainLayout
      header={<Header />}
      leftPanel={<HierarchyPanel />}
      centerPanel={<SceneView />}
      rightPanel={<InspectorPanel />}
      bottomPanel={<ProjectPanel />}
    />
  );
}

export default App;
