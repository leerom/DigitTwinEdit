export interface Project {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  thumbnail?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  thumbnail?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  thumbnail?: string;
}

export interface ProjectResponse {
  id: number;
  name: string;
  description?: string;
  thumbnail?: string;
  created_at: string;
  updated_at: string;
  scene_count?: number;
}

export interface ProjectWithScenesResponse extends ProjectResponse {
  scenes: Array<{
    id: number;
    name: string;
    is_active: boolean;
    updated_at: string;
  }>;
}
