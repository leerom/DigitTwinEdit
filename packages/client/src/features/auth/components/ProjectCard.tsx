import { Calendar, FolderOpen } from 'lucide-react';
import type { ProjectResponse } from '@digittwinedit/shared';

interface ProjectCardProps {
  project: ProjectResponse;
  isSelected: boolean;
  onSelect: (project: ProjectResponse) => void;
}

export function ProjectCard({ project, isSelected, onSelect }: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <button
      onClick={() => onSelect(project)}
      className={`
        w-full p-4 rounded-lg border-2 transition-all text-left
        ${
          isSelected
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 bg-gray-800 hover:border-gray-600'
        }
      `}
    >
      {/* 缩略图 */}
      <div className="w-full h-32 bg-gray-700 rounded mb-3 flex items-center justify-center">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <FolderOpen className="w-12 h-12 text-gray-500" />
        )}
      </div>

      {/* 项目信息 */}
      <h3 className="text-white font-semibold mb-1 truncate">
        {project.name}
      </h3>

      {project.description && (
        <p className="text-gray-400 text-sm mb-2 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* 更新时间 */}
      <div className="flex items-center text-gray-500 text-xs">
        <Calendar className="w-3 h-3 mr-1" />
        <span>Updated {formatDate(project.updated_at)}</span>
      </div>
    </button>
  );
}
