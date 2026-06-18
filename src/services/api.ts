import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const CSRF_COOKIE_NAME = 'pld_csrf';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const encodedName = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(encodedName)) {
      return decodeURIComponent(trimmed.slice(encodedName.length));
    }
  }
  return null;
}

function isPublicAuthRoute(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/auth/callback')
  );
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = (config.method || 'get').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && config.headers) {
      const csrfToken = readCookie(CSRF_COOKIE_NAME);
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

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

    const isRefreshRequest = (originalRequest.url || '').includes('/api/v1/auth/refresh');
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: {
              'X-CSRF-Token': readCookie(CSRF_COOKIE_NAME) || '',
            },
          },
        );
        return api(originalRequest);
      } catch (refreshError) {
        if (!isPublicAuthRoute(currentPath)) {
          toast.error('Sesión expirada. Por favor inicia sesión nuevamente.');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response) {
      switch (error.response.status) {
        case 403:
          toast.error('No tienes permisos para realizar esta acción.');
          break;
        case 422: {
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
        }
        case 429:
          toast.error('Demasiadas solicitudes. Por favor espera un momento.');
          break;
        case 402: {
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
          toast.error('Servicio sigue degradado. Por favor reintenta en un minuto.');
          break;
        default: {
          const message = (error.response.data as { detail?: string })?.detail;
          if (typeof message === 'string') {
            toast.error(message);
          }
        }
      }
    } else if (error.request) {
      toast.error('Error de conexión. Verifica tu internet.');
    }

    return Promise.reject(error);
  },
);

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
