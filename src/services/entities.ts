import api from './api';
import type { APIEntity } from '@/types/api';
import type { RelationshipListItem } from './graph';

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
  image?: string;                       // foto (Wikidata P18 → Commons)
  wikipedia?: Record<string, string>;   // {en: url, es: url}
  official_website?: string;
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
  pep_in_office?: boolean;
  pep_monitoring_active?: boolean;
  pep_status?: 'current_pep' | 'former_pep_in_monitoring' | 'ex_pep' | 'non_pep';
  pep_monitoring_until?: string | null;
  pep_last_office_end_date?: string | null;
  pep_policy_years?: number;
  pep_category?: string;
}

export interface ProfileCareer {
  positions: WikidataLink[];
  education: WikidataLink[];
  political: WikidataLink[];
  occupations: string[];
  pep_positions: Array<{
    name?: string;
    cargo?: string;
    status?: string;
    country?: string;
    start_date?: string;
    end_date?: string;
    source_dataset?: string;
    source?: string;
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
  aml_visible_relationships: number;
  contextual_relationships: number;
  total_detected_relationships: number;
  all_relationship_counts: Record<string, number>;
  contextual_relationship_counts: Record<string, number>;
  visible_relationships_preview: RelationshipListItem[];
  visible_relationships_preview_total: number;
  visible_relationships_preview_by_type: Record<string, number>;
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
    // v1 fue eliminado (todo es v2/FTM). El detalle de entidad ahora vive en
    // GET /api/v2/entities/{id} (EntityDetail), cuyo shape difiere del APIEntity
    // legacy: canonical_name/all_sources/risk_score/birth_date/countries en vez
    // de primary_name/data_sources/overall_risk_score/date_of_birth/country.
    // Se mapea aquí para que los consumidores existentes sigan funcionando.
    const response = await api.get(`/api/v2/entities/${id}`, {
      params: source_level ? { source_level } : undefined,
    });
    const d = response.data ?? {};
    return {
      ...d,
      primary_name: d.canonical_name ?? d.primary_name,
      data_sources: d.all_sources ?? d.data_sources ?? [],
      overall_risk_score: d.risk_score ?? d.overall_risk_score,
      date_of_birth: d.birth_date ?? d.date_of_birth,
      country: Array.isArray(d.countries) ? d.countries[0] : d.country,
      is_sanctioned: d.is_sanctioned ?? ((d.sanctions_details?.length ?? 0) > 0),
      // APIEntity declara estos arrays como requeridos; EntityDetail (v2) usa
      // otros nombres o no los trae. Se proveen defaults para que el consumidor
      // (que lee .length sin guard) no crashee.
      sanctions: d.sanctions ?? d.sanctions_details ?? [],
      sanctions_details: d.sanctions_details ?? [],
      pep_entries: d.pep_entries ?? d.pep_positions ?? [],
      adverse_media: d.adverse_media ?? [],
      aliases: d.aliases ?? [],
      addresses: d.addresses ?? [],
      identifications: d.identifications ?? [],
      risk_factors: d.risk_factors ?? [],
      source_records: d.source_records ?? [],
    } as APIEntity;
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
