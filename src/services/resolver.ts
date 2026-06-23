/**
 * Resolver admin API client (Fase C).
 *
 * Endpoints:
 * - GET  /api/v2/admin/er/status
 * - GET  /api/v2/admin/er/unsure?limit=&offset=
 * - POST /api/v2/admin/er/decide
 */
import { api } from './api';

export interface ResolverStatus {
  judgements: {
    positive: number;
    negative: number;
    unsure: number;
    no_judgement: number;
    total: number;
  };
  /** Pares accionables: ambos lados son entidades Gold activas (lo que va a la cola). */
  reviewable?: {
    unsure: number;
    positive: number;
    negative: number;
  };
  /** Pares 'stale': un lado fue fusionado/desactivado por el dedup → sin acción. */
  stale?: {
    unsure: number;
    positive: number;
    negative: number;
  };
  canonical_ids_count: number;
  thresholds: { positive: number; negative: number };
}

export interface UnsurePair {
  source: string;
  target: string;
  judgement: string;
  user: string;
  score: number | null;
  created_at: string | null;
}

export interface DecideResponse {
  ok: boolean;
  left_id: string;
  right_id: string;
  judgement: string;
  canonical_after: string | null;
}

export const resolverService = {
  async getStatus(): Promise<ResolverStatus> {
    const { data } = await api.get('/api/v2/admin/er/status');
    return data;
  },

  async listUnsure(limit = 50, offset = 0): Promise<{ pairs: UnsurePair[]; count: number }> {
    const { data } = await api.get('/api/v2/admin/er/unsure', {
      params: { limit, offset },
    });
    return data;
  },

  async decide(
    leftId: string,
    rightId: string,
    judgement: 'positive' | 'negative' | 'unsure',
    user = 'operator',
  ): Promise<DecideResponse> {
    const { data } = await api.post('/api/v2/admin/er/decide', {
      left_id: leftId,
      right_id: rightId,
      judgement,
      user,
    });
    return data;
  },
};
