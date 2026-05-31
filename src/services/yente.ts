/**
 * Yente-compatible API client (Phase 6).
 *
 * Endpoints expuestos:
 * - GET  /api/v2/yente/catalog
 * - POST /api/v2/yente/match/{dataset}
 * - GET  /api/v2/yente/search/{dataset}
 * - GET  /api/v2/yente/federated/search    ← local + leaks + external
 * - GET  /api/v2/yente/entities/{id}
 */
import { api } from './api';

export interface YenteDataset {
  name: string;
  title: string;
  type: string;
  entity_count: number;
  last_updated: string | null;
}

export interface YenteCatalog {
  datasets: YenteDataset[];
  updated_at: string;
}

export interface FederatedMatch {
  id: string;
  caption: string;
  schema: string;
  score: number;
  datasets: string[];
  is_pep: boolean;
  is_sanctioned: boolean;
}

export interface FederatedSearchResponse {
  query: string;
  candidates_evaluated: number;
  threshold: number;
  results_by_origin: {
    local: FederatedMatch[];
    leaks: FederatedMatch[];
    external: FederatedMatch[];
  };
  totals: { local: number; leaks: number; external: number };
}

export const yenteService = {
  async getCatalog(): Promise<YenteCatalog> {
    const { data } = await api.get('/api/v2/yente/catalog');
    return data;
  },

  async federatedSearch(params: {
    q: string;
    schema?: string;
    limit?: number;
    threshold?: number;
  }): Promise<FederatedSearchResponse> {
    const { data } = await api.get('/api/v2/yente/federated/search', {
      params: { limit: 20, threshold: 0.5, ...params },
    });
    return data;
  },

  async getEntity(entityId: string): Promise<any> {
    const { data } = await api.get(`/api/v2/yente/entities/${entityId}`);
    return data;
  },
};
