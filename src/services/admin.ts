import api from './api';
import type { DashboardStats, AuditLogEntry, User } from '@/types/api';

export const adminService = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const response = await api.get('/api/v1/admin/stats');
    return response.data;
  },

  /**
   * Get audit log
   */
  async getAuditLog(filters?: {
    user_id?: string;
    action?: string;
    entity_id?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const response = await api.get('/api/v1/admin/audit-log', { params: filters });
    return response.data;
  },

  /**
   * Export audit log
   */
  async exportAuditLog(format: 'csv' | 'json' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await api.get('/api/v1/admin/audit-log/export', {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get users list
   */
  async getUsers(): Promise<User[]> {
    const response = await api.get('/api/v1/admin/users');
    return response.data;
  },

  /**
   * Create user
   */
  async createUser(userData: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    role: string;
  }): Promise<User> {
    const response = await api.post('/api/v1/admin/users', userData);
    return response.data;
  },

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const response = await api.put(`/api/v1/admin/users/${userId}`, updates);
    return response.data;
  },

  /**
   * Trigger data sync
   */
  async triggerSync(source?: string): Promise<{ task_id: string; status: string }> {
    const response = await api.post('/api/v1/admin/sync', { source });
    return response.data;
  },

  /**
   * Get sync status
   */
  async getSyncStatus(taskId: string): Promise<{
    task_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    message?: string;
    completed_at?: string;
  }> {
    const response = await api.get(`/api/v1/admin/sync/${taskId}`);
    return response.data;
  },

  /**
   * Clear cache
   */
  async clearCache(): Promise<{ message: string }> {
    const response = await api.post('/api/v1/admin/cache/clear');
    return response.data;
  },

  /**
   * Get webhooks configuration
   */
  async getWebhooks(): Promise<Array<{
    id: string;
    url: string;
    events: string[];
    is_active: boolean;
    created_at: string;
  }>> {
    const response = await api.get('/api/v1/admin/webhooks');
    return response.data;
  },

  /**
   * Create webhook
   */
  async createWebhook(webhook: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<{ id: string }> {
    const response = await api.post('/api/v1/admin/webhooks', webhook);
    return response.data;
  },
};

export default adminService;
