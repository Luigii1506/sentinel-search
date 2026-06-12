import { api } from './api';

export type ApiKeyRole = 'admin' | 'analyst' | 'readonly';

export interface ApiKeySummary {
  id: string;
  client_name: string;
  key_prefix: string;
  role: ApiKeyRole;
  is_active: boolean;
  description: string | null;
  created_by: string | null;
  created_at: string | null;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
}

/**
 * Returned ONLY by POST /api-keys and the rotate endpoint. The full
 * `api_key` field is shown to the user exactly once — never persist or
 * log it on the client beyond the copy-once modal.
 */
export interface ApiKeyCreated extends ApiKeySummary {
  api_key: string;
}

export interface CreateApiKeyPayload {
  client_name: string;
  role: ApiKeyRole;
  description?: string;
  expires_in_days?: number;
}

export const apiKeysService = {
  async list(opts: { client_name?: string; include_revoked?: boolean } = {}): Promise<ApiKeySummary[]> {
    const params = new URLSearchParams();
    if (opts.client_name) params.set('client_name', opts.client_name);
    if (opts.include_revoked) params.set('include_revoked', 'true');
    const qs = params.toString();
    const { data } = await api.get<ApiKeySummary[]>(
      `/api/v1/admin/api-keys${qs ? `?${qs}` : ''}`,
    );
    return data;
  },

  async create(payload: CreateApiKeyPayload): Promise<ApiKeyCreated> {
    const { data } = await api.post<ApiKeyCreated>('/api/v1/admin/api-keys', payload);
    return data;
  },

  async rotate(keyId: string, expires_in_days?: number): Promise<ApiKeyCreated> {
    const params = expires_in_days ? `?expires_in_days=${expires_in_days}` : '';
    const { data } = await api.post<ApiKeyCreated>(
      `/api/v1/admin/api-keys/${keyId}/rotate${params}`,
    );
    return data;
  },

  async revoke(keyId: string): Promise<void> {
    await api.delete(`/api/v1/admin/api-keys/${keyId}`);
  },
};
