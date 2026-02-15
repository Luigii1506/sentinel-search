import api from './api';
import type { GraphData, GraphRelationship } from '@/types/api';

export const graphService = {
  /**
   * Get entity relationships for graph visualization
   */
  async getRelationships(entityId: string, options?: {
    depth?: number;
    relationship_types?: string[];
    min_confidence?: number;
  }): Promise<GraphData> {
    const response = await api.get(`/api/v1/graph/relationships/${entityId}`, {
      params: options,
    });
    return response.data;
  },

  /**
   * Detect cycles in entity network
   */
  async detectCycles(entityId: string, maxDepth: number = 5): Promise<{
    cycles_found: boolean;
    cycles: Array<{
      path: string[];
      entities: string[];
      risk_score: number;
    }>;
    risk_indicators: string[];
  }> {
    const response = await api.get(`/api/v1/graph/detect-cycles`, {
      params: { entity_id: entityId, max_depth: maxDepth },
    });
    return response.data;
  },

  /**
   * Calculate risk propagation
   */
  async getRiskPropagation(entityId: string): Promise<{
    entity_id: string;
    propagated_risk: number;
    affected_entities: Array<{
      entity_id: string;
      name: string;
      original_risk: number;
      propagated_risk: number;
      path_length: number;
      connection_type: string;
    }>;
    risk_paths: Array<{
      path: string[];
      cumulative_risk: number;
    }>;
  }> {
    const response = await api.get(`/api/v1/graph/risk-propagation/${entityId}`);
    return response.data;
  },

  /**
   * Find shortest path between two entities
   */
  async findPath(fromId: string, toId: string): Promise<{
    path_found: boolean;
    path?: {
      nodes: string[];
      relationships: GraphRelationship[];
      distance: number;
    };
  }> {
    const response = await api.get('/api/v1/graph/shortest-path', {
      params: { from: fromId, to: toId },
    });
    return response.data;
  },

  /**
   * Get network communities
   */
  async getCommunities(entityId: string): Promise<{
    entity_id: string;
    community_id: string;
    community_size: number;
    community_entities: Array<{
      id: string;
      name: string;
      risk_level: string;
    }>;
    risk_profile: 'high' | 'medium' | 'low';
  }> {
    const response = await api.get(`/api/v1/graph/communities/${entityId}`);
    return response.data;
  },
};

export default graphService;
