export interface User {
  id: number;
  username: string;
  email?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserLoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface UserRegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email?: string;
}
