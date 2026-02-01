import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';
import { useProjectStore } from '../../../stores/projectStore';

export function SceneSwitcher() {
  const { scenes, currentScene, currentSceneId, switchScene, createScene } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCreateScene = async () => {
    if (!newSceneName.trim()) return;

    try {
      await createScene(newSceneName);
      setNewSceneName('');
      setIsCreating(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create scene:', error);
      alert('Failed to create scene');
    }
  };

  const handleSwitchScene = async (sceneId: number) => {
    if (sceneId === currentSceneId) {
      setIsOpen(false);
      return;
    }

    try {
      await switchScene(sceneId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch scene:', error);
      alert('Failed to switch scene');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
      >
        <span>{currentScene?.name || 'No Scene'}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          {/* Scene List */}
          <div className="max-h-64 overflow-y-auto">
            {scenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => handleSwitchScene(scene.id)}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>{scene.name}</span>
                {scene.id === currentSceneId && (
                  <Check size={16} className="text-blue-500" />
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700" />

          {/* Create New Scene */}
          {isCreating ? (
            <div className="p-2">
              <input
                type="text"
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateScene();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewSceneName('');
                  }
                }}
                placeholder="Scene name..."
                className="w-full px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreateScene}
                  className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewSceneName('');
                  }}
                  className="flex-1 px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              <span>New Scene</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
