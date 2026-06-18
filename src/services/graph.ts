import api from './api';
import type { NetworkData } from '@/types/api';

export interface RelationshipListItem {
  direction: 'outgoing' | 'incoming';
  type: string;
  subtype?: string;
  description?: string;
  related_entity_name: string;
  related_entity_id?: string;
  related_entity_type?: string;
  is_resolved: boolean;
  confidence: number;
  source?: string;
  percentage?: number;
  start_date?: string;
  end_date?: string;
  relationship_level?: string;
  relationship_strength?: number;
  aml_priority?: 'critical' | 'high' | 'medium' | 'low';
  context_category?: 'aml_core' | 'affiliation' | 'profile_context' | 'unknown';
  is_noise: boolean;
  related_entity_risk_score?: number;
  related_entity_risk_level?: string;
  related_entity_is_pep?: boolean;
  related_entity_countries?: string[];
  related_entity_sources?: string[];
}

export interface RelationshipsListResponse {
  entity_id: string;
  entity_name: string;
  relationships: RelationshipListItem[];
  total: number;
  by_type: Record<string, number>;
}

export const graphService = {
  async getNetwork(entityId: string, options?: {
    depth?: number;
    filter_types?: string[];
  }): Promise<NetworkData> {
    const params = new URLSearchParams();
    if (options?.depth) params.append('depth', options.depth.toString());
    if (options?.filter_types?.length) {
      options.filter_types.forEach((t) => params.append('filter_types', t));
    }

    const response = await api.get(`/api/v2/entities/${entityId}/network?${params.toString()}`);
    return response.data;
  },

  async getRelationshipsList(entityId: string, options?: {
    type?: string;
    level?: string;
    aml_priority?: 'critical' | 'high' | 'medium' | 'low';
    context_category?: 'aml_core' | 'affiliation' | 'profile_context' | 'unknown';
    min_strength?: number;
    hide_noise?: boolean;
    limit?: number;
  }): Promise<RelationshipsListResponse> {
    const response = await api.get(`/api/v2/entities/${entityId}/relationships`, {
      params: options,
    });
    return response.data;
  },
};

export default graphService;
