import api from './api';
import type { LoginCredentials, LoginResponse, User } from '@/types/api';

export interface SignupCredentials {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export const authService = {
  async signup(credentials: SignupCredentials): Promise<LoginResponse> {
    const response = await api.post('/api/v1/auth/signup', credentials);
    return response.data;
  },

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post('/api/v1/auth/login', {
      username: credentials.email,
      password: credentials.password,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/api/v1/auth/revoke', {});
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get('/api/v1/auth/me');
      return response.data;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return false;
  },

  async refreshToken(): Promise<string | null> {
    try {
      const response = await api.post('/api/v1/auth/refresh', {});
      return response.data?.access_token || null;
    } catch {
      return null;
    }
  },
};

export default authService;
