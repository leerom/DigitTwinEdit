import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ProjectCard } from '../ProjectCard';
import type { ProjectResponse } from '@digittwinedit/shared';

describe('ProjectCard', () => {
  const mockProject: ProjectResponse = {
    id: 1,
    name: 'Test Project',
    description: 'A test project',
    thumbnail: undefined,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  };

  it('should render project information', () => {
    const onSelect = vi.fn();

    render(
      <ProjectCard
        project={mockProject}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('A test project')).toBeInTheDocument();
  });

  it('should show selected state', () => {
    const onSelect = vi.fn();

    const { container } = render(
      <ProjectCard
        project={mockProject}
        isSelected={true}
        onSelect={onSelect}
      />
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('border-blue-500');
  });

  it('should call onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <ProjectCard
        project={mockProject}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    const card = screen.getByText('Test Project').closest('button');
    await user.click(card!);

    expect(onSelect).toHaveBeenCalledWith(mockProject);
  });

  it('should show placeholder icon when no thumbnail', () => {
    const onSelect = vi.fn();

    const { container } = render(
      <ProjectCard
        project={mockProject}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    // Check for FolderOpen icon (lucide-react renders as svg)
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should display thumbnail when provided', () => {
    const projectWithThumbnail = {
      ...mockProject,
      thumbnail: 'https://example.com/thumb.jpg',
    };

    const onSelect = vi.fn();

    render(
      <ProjectCard
        project={projectWithThumbnail}
        isSelected={false}
        onSelect={onSelect}
      />
    );

    const img = screen.getByAltText('Test Project');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg');
  });
});
