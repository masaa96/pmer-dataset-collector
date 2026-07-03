/**
 * Authentication API service
 * Handles login and user authentication
 */
import api from './config';

export interface UserResponse {
  email: string;
  name: string;
  created_at: string;
  is_admin: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface LoginRequest {
  email: string;
}

/**
 * Login user with email
 */
export const login = async (email: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/api/auth/login', { email });
  return response.data;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<UserResponse> => {
  const response = await api.get<UserResponse>('/api/auth/me');
  return response.data;
};
