import { api } from './api';

export type UserRoleName = 'admin' | 'reviewer' | 'analyst' | 'viewer' | 'readonly';

export interface AppUser {
  id: string;
  username: string;
  email: string | null;
  role: UserRoleName;
  api_key_name: string | null;
  is_active: boolean;
  created_at: string | null;
  last_login: string | null;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  email?: string;
  role?: UserRoleName;
  api_key_name?: string;
}

export interface UpdateUserPayload {
  email?: string;
  role?: UserRoleName;
  is_active?: boolean;
}

export const usersService = {
  async list(): Promise<AppUser[]> {
    const { data } = await api.get<AppUser[]>('/api/v1/admin/users');
    return data;
  },

  async create(payload: CreateUserPayload): Promise<AppUser> {
    const { data } = await api.post<AppUser>('/api/v1/admin/users', payload);
    return data;
  },

  async update(id: string, payload: UpdateUserPayload): Promise<AppUser> {
    const { data } = await api.patch<AppUser>(`/api/v1/admin/users/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/admin/users/${id}`);
  },
};
