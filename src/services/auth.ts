import api, { tokenManager } from './api';
import type { LoginCredentials, LoginResponse, User } from '@/types/api';

export interface SignupCredentials {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export const authService = {
  /**
   * Self-service signup. Creates a free-tier account and returns tokens
   * so the caller can land authenticated.
   */
  async signup(credentials: SignupCredentials): Promise<LoginResponse> {
    const response = await api.post('/api/v1/auth/signup', credentials);
    const { access_token, refresh_token } = response.data;
    tokenManager.setToken(access_token);
    tokenManager.setRefreshToken(refresh_token);
    return response.data;
  },

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Use form data as expected by OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);

    const response = await api.post('/api/v1/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token } = response.data;
    
    // Store tokens
    tokenManager.setToken(access_token);
    tokenManager.setRefreshToken(refresh_token);

    return response.data;
  },

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    try {
      await api.post('/api/v1/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenManager.clearTokens();
    }
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get('/api/v1/auth/me');
      return response.data;
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!tokenManager.getToken();
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) return null;

      const response = await api.post('/api/v1/auth/refresh', {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token } = response.data;
      tokenManager.setToken(access_token);
      tokenManager.setRefreshToken(refresh_token);
      
      return access_token;
    } catch (error) {
      tokenManager.clearTokens();
      return null;
    }
  },
};

export default authService;
