import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SceneView } from '@/components/viewport/SceneView';

import { Hierarchy } from '@/components/panels/Hierarchy';
import { useSelectionSync } from '@/features/editor/hooks/useSelectionSync';
import { useToolShortcuts } from '@/features/editor/hooks/useToolShortcuts';

import { Project } from '@/components/panels/Project';
import { Inspector } from '@/components/panels/Inspector';
import { useGlobalShortcuts } from '@/features/editor/hooks/useGlobalShortcuts';

import { exportSceneToJson } from '@/features/scene/SceneExporter';
import { Download } from 'lucide-react';

function App() {
  useSelectionSync();
  useToolShortcuts();
  useGlobalShortcuts();

  return (
    <MainLayout
      header={
        <div className="h-full flex items-center justify-between px-4 font-bold text-lg">
          <div className="flex items-center">
             <span className="text-primary mr-2">DigitalTwin</span>Editor
          </div>
          <button
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white transition-colors"
            onClick={exportSceneToJson}
          >
            <Download size={14} />
            Export Scene
          </button>
        </div>
      }
      leftPanel={<Hierarchy />}
      centerPanel={<SceneView />}
      rightPanel={<Inspector />}
      bottomPanel={<Project />}
    />
  );
}

export default App;
