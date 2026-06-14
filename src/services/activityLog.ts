import { api } from './api';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string | null;
  auth_method: 'jwt' | 'api_key' | null;
  action: string;          // HTTP method
  endpoint: string;        // URL path
  status_code: number | null;
  ip_address: string | null;
  duration_ms: number | null;
}

export interface ActivityLogFilters {
  username?: string;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  status_code?: number;
  limit?: number;
  offset?: number;
}

export const activityLogService = {
  async list(filters: ActivityLogFilters = {}): Promise<AuditLogEntry[]> {
    const params = new URLSearchParams();
    if (filters.username) params.set('username', filters.username);
    if (filters.endpoint) params.set('endpoint', filters.endpoint);
    if (filters.method) params.set('method', filters.method);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    const { data } = await api.get<AuditLogEntry[]>(
      `/api/v1/admin/audit${qs ? `?${qs}` : ''}`,
    );
    return data;
  },
};
