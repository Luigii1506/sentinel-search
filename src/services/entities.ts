import api from './api';
import type { APIEntity } from '@/types/api';

const referenceResolutionCache = new Map<string, ReferenceResolution>();

function buildReferenceCacheKey(params: { qid?: string; name?: string }): string {
  return `${params.qid || ''}::${(params.name || '').trim().toLowerCase()}`;
}

// ── Profile types (from /api/v2/entities/{id}/profile) ──

export interface WikidataLink {
  qid?: string;
  name: string;
  entity_id?: string;
  start?: string | null;
  end?: string | null;
  is_current?: boolean | null;
}

export interface ProfileNationality {
  code: string;
  name: string;
}

export interface ProfileHeader {
  display_name: string;
  canonical_name: string;
  description?: string;
  entity_type: string;
  risk_level: string;
  risk_score: number;
  topics: string[];
  wikidata_qid?: string;
  reference_tier?: 'premium' | 'graph_only' | 'suppress';
  reference_tier_reason?: string;
}

export interface ProfileOverview {
  nationalities: ProfileNationality[];
  birth_date?: string;
  birth_place?: string;
  death_date?: string;
  death_place?: string;
  gender?: string;
  all_names: string[];
  sources: string[];
  source_count: number;
  is_pep: boolean;
  is_current_pep?: boolean;
  pep_category?: string;
}

export interface ProfileCareer {
  positions: WikidataLink[];
  education: WikidataLink[];
  political: WikidataLink[];
  occupations: string[];
  pep_positions: Array<{
    cargo: string;
    estado?: string;
    source?: string;
    country?: string;
    partido?: string;
    is_current?: boolean;
    start_date?: string;
    pep_category?: string;
  }>;
}

export interface ProfilePersonal {
  religion?: string;
  ethnicity?: string;
  nicknames: string[];
  pseudonyms: string[];
}

export interface ProfileConnections {
  family: {
    father?: WikidataLink;
    mother?: WikidataLink;
    spouses: WikidataLink[];
    children: WikidataLink[];
    siblings: WikidataLink[];
  };
  relationship_counts: Record<string, number>;
  total_relationships: number;
}

export interface ProfileRisk {
  sanctions_details: Array<{
    authority: string;
    program: string;
    reason?: string;
    start_date?: string;
    end_date?: string;
    listed_date?: string;
    source_url?: string;
    provisions?: string;
  }>;
  convicted_of: WikidataLink[];
  military_rank?: string;
  military_branch?: string;
  conflicts: WikidataLink[];
  net_worth?: string;
  cause_of_death?: string;
}

export interface EntityProfile {
  id: string;
  lang: string;
  header: ProfileHeader;
  overview: ProfileOverview;
  career: ProfileCareer;
  personal: ProfilePersonal;
  risk: ProfileRisk;
  connections: ProfileConnections;
  identifiers: Record<string, string>;
  cross_references: {
    os_id?: string;
    datasets: string[];
    referents: string[];
  };
  addresses: string[];
  first_seen_at?: string;
  last_seen_at?: string;
}

export interface ReferenceResolution {
  found: boolean;
  entity_id?: string;
  canonical_name?: string;
  entity_type?: string;
  entity_category?: string;
  reference_tier?: 'premium' | 'graph_only' | 'suppress';
  match_by?: 'qid' | 'name';
  qid?: string;
  query_name?: string;
}

export const entityService = {
  /**
   * Get entity by ID
   */
  async getById(id: string, source_level?: number): Promise<APIEntity> {
    const response = await api.get(`/api/v1/entity/${id}`, {
      params: source_level ? { source_level } : undefined,
    });
    return response.data;
  },

  /**
   * Get enriched entity profile (Wikidata bilingual data)
   */
  async getProfile(id: string, lang: string = 'es'): Promise<EntityProfile> {
    const response = await api.get(`/api/v2/entities/${id}/profile`, {
      params: { lang },
    });
    return response.data;
  },

  /**
   * Resolve a profile/reference item to a Gold entity if it exists.
   */
  async resolveReference(params: { qid?: string; name?: string }): Promise<ReferenceResolution> {
    const cacheKey = buildReferenceCacheKey(params);
    const cached = referenceResolutionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await api.get('/api/v2/entities/references/resolve', {
      params,
    });
    referenceResolutionCache.set(cacheKey, response.data);
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
