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

export interface CanonicalGroupMember {
  id: string;
  name: string | null;
  is_gold: boolean;
  is_active: boolean;
  birth_date: string | null;
  gender: string | null;
  countries: string[];
  identifiers: Record<string, unknown>;
  sources: string[];
  risk_score: number | null;
}

export interface CanonicalGroup {
  canonical_id: string;
  canonical_name: string | null;
  size: number;
  suspicious: boolean;
  /** Códigos de conflicto, p.ej. "birth_date", "gender", "country", "id:taxNumber". */
  conflicts: string[];
  members: CanonicalGroupMember[];
}

export interface CanonicalGroupsResponse {
  total: number;
  suspicious_total: number;
  limit: number;
  offset: number;
  only_suspicious: boolean;
  groups: CanonicalGroup[];
}

export interface JudgementPair {
  left_id: string;
  left_name: string | null;
  right_id: string;
  right_name: string | null;
  user: string | null;
  score: number | null;
  created_at: string | null;
}

export interface JudgementsResponse {
  judgement: 'positive' | 'negative';
  reviewable_only: boolean;
  total: number;
  limit: number;
  offset: number;
  pairs: JudgementPair[];
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

  async getCanonicalGroups(limit = 50, offset = 0, onlySuspicious = false): Promise<CanonicalGroupsResponse> {
    const { data } = await api.get('/api/v2/admin/er/canonical-groups', {
      params: { limit, offset, only_suspicious: onlySuspicious },
    });
    return data;
  },

  async getJudgements(
    judgement: 'positive' | 'negative',
    reviewableOnly = true,
    limit = 50,
    offset = 0,
  ): Promise<JudgementsResponse> {
    const { data } = await api.get('/api/v2/admin/er/judgements', {
      params: { judgement, reviewable_only: reviewableOnly, limit, offset },
    });
    return data;
  },
};
