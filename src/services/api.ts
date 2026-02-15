import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Token storage keys
const TOKEN_KEY = 'pld_token';
const REFRESH_TOKEN_KEY = 'pld_refresh_token';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
  timeout: 30000, // 30 seconds
});

// Token management
export const tokenManager = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  setToken: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  setRefreshToken: (token: string): void => localStorage.setItem(REFRESH_TOKEN_KEY, token),
  clearTokens: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// Request interceptor - Add JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - Try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Attempt to refresh token
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        tokenManager.setToken(access_token);
        tokenManager.setRefreshToken(refresh_token);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        tokenManager.clearTokens();
        toast.error('Sesión expirada. Por favor inicia sesión nuevamente.');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle specific error codes
    if (error.response) {
      switch (error.response.status) {
        case 403:
          toast.error('No tienes permisos para realizar esta acción.');
          break;
        case 422:
          // Validation error - FastAPI returns array of errors
          const data = error.response.data as { detail?: Array<{ msg: string; loc: string[] }> | string };
          if (Array.isArray(data.detail)) {
            const firstError = data.detail[0];
            if (firstError && typeof firstError === 'object') {
              const field = firstError.loc?.join('.') || 'campo';
              toast.error(`${field}: ${firstError.msg}`);
            }
          } else if (typeof data.detail === 'string') {
            toast.error(data.detail);
          }
          break;
        case 429:
          toast.error('Demasiadas solicitudes. Por favor espera un momento.');
          break;
        case 500:
          toast.error('Error del servidor. Intenta más tarde.');
          break;
        default:
          // Show backend error message if available
          const message = (error.response.data as { detail?: string })?.detail;
          if (typeof message === 'string') {
            toast.error(message);
          }
      }
    } else if (error.request) {
      // Network error
      toast.error('Error de conexión. Verifica tu internet.');
    }

    return Promise.reject(error);
  }
);

// Health check
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    return null;
  }
};

export default api;
