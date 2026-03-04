import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useProjectStore } from '../../../stores/projectStore';

export function SceneSwitcher() {
  const { scenes, currentScene, currentSceneId, switchScene } = useProjectStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
        </div>
      )}
    </div>
  );
}
