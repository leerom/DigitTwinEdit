import { UserResponse } from './user.js';
import { ProjectResponse, ProjectWithScenesResponse } from './project.js';
import { SceneResponse, SceneWithDataResponse } from './scene.js';

// Generic API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth API Responses
export interface LoginResponse {
  success: boolean;
  user: UserResponse;
  message: string;
}

export interface RegisterResponse {
  success: boolean;
  user: UserResponse;
  message: string;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  user: UserResponse | null;
}

// Project API Responses
export interface ProjectsResponse {
  success: boolean;
  projects: ProjectResponse[];
}

export interface ProjectWithScenesResponseWrapped {
  success: boolean;
  project: ProjectWithScenesResponse;
}

export interface ProjectResponseWrapped {
  success: boolean;
  project: ProjectResponse;
  message?: string;
}

// Scene API Responses
export interface ScenesResponse {
  success: boolean;
  scenes: SceneResponse[];
}

export interface SceneResponseWrapped {
  success: boolean;
  scene: SceneWithDataResponse;
  message?: string;
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode?: number;
}
