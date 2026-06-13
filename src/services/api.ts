import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

// Token storage keys
const TOKEN_KEY = 'pld_token';
const REFRESH_TOKEN_KEY = 'pld_refresh_token';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const API_KEY = import.meta.env.VITE_API_KEY || 'sk-dev-test-key-12345';

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
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retry503?: boolean;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle 503 Service Unavailable — backend reports OS degraded.
    // Auto-retry ONCE after Retry-After header (default 10s) before surfacing
    // the error to the caller. Avoids flashing "Error" on a transient blip.
    if (error.response?.status === 503 && !originalRequest._retry503) {
      originalRequest._retry503 = true;
      const retryAfterHeader = error.response.headers['retry-after'];
      const retryAfterSec = Math.min(
        Math.max(parseInt(retryAfterHeader || '10', 10) || 10, 1),
        30,
      );
      const detail =
        (error.response.data as { detail?: string })?.detail ||
        'Servicio recuperándose';
      toast.warning(`${detail}. Reintentando en ${retryAfterSec}s…`);
      await new Promise((r) => setTimeout(r, retryAfterSec * 1000));
      return api(originalRequest);
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
        case 402: {
          // Quota exhausted on the free tier. Surface the upgrade CTA
          // and refresh the navbar counter so the user sees 0/N
          // immediately. Headers from backend carry the metadata.
          const headers = error.response.headers;
          const limit = headers['x-quota-limit'];
          const reset = headers['x-quota-reset'];
          const detail =
            (error.response.data as { detail?: string })?.detail ||
            'Has alcanzado el límite diario.';
          toast.error(detail, {
            description: limit
              ? `Plan actual: ${limit} búsquedas/día. Resetea: ${reset || 'pronto'}.`
              : undefined,
            action: {
              label: 'Upgrade',
              onClick: () => {
                window.location.href = '/pricing';
              },
            },
            duration: 10_000,
          });
          // Invalidate the cached usage snapshot so the navbar updates.
          try {
            const evt = new CustomEvent('quota:exhausted');
            window.dispatchEvent(evt);
          } catch {
            /* noop */
          }
          break;
        }
        case 500:
          toast.error('Error del servidor. Intenta más tarde.');
          break;
        case 503:
          // Reached only after the auto-retry above also failed.
          toast.error('Servicio sigue degradado. Por favor reintenta en un minuto.');
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
