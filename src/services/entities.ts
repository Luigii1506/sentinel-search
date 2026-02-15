import api from './api';
import type { APIEntity } from '@/types/api';

export const entityService = {
  /**
   * Get entity by ID
   */
  async getById(id: string): Promise<APIEntity> {
    const response = await api.get(`/api/v1/entity/${id}`);
    return response.data;
  },

  /**
   * Search entities
   */
  async search(query: string, filters?: {
    entity_type?: string;
    risk_level?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entities: APIEntity[]; total: number }> {
    const response = await api.get('/api/v1/entity', {
      params: {
        q: query,
        ...filters,
      },
    });
    return response.data;
  },

  /**
   * Get entity audit trail
   */
  async getAuditTrail(entityId: string): Promise<{
    entity_id: string;
    screenings: Array<{
      id: string;
      timestamp: string;
      user: string;
      query: string;
      match_score: number;
    }>;
    investigations: Array<{
      id: string;
      status: string;
      opened_at: string;
      closed_at?: string;
      assigned_to?: string;
    }>;
  }> {
    const response = await api.get(`/api/v1/entity/${entityId}/audit`);
    return response.data;
  },

  /**
   * Add entity note/investigation
   */
  async addNote(entityId: string, note: {
    content: string;
    type: 'general' | 'finding' | 'decision' | 'escalation';
  }): Promise<void> {
    await api.post(`/api/v1/entity/${entityId}/notes`, note);
  },

  /**
   * Get entity statistics
   */
  async getStats(): Promise<{
    total: number;
    by_type: Record<string, number>;
    by_risk_level: Record<string, number>;
    by_source: Record<string, number>;
    recent_additions: number;
  }> {
    const response = await api.get('/api/v1/entity/stats');
    return response.data;
  },
};

export default entityService;
