/**
 * Provenance + Time-travel APIs (Phase B/F del PROFESSIONAL_PLATFORM_PLAN).
 *
 * Endpoints:
 * - GET /api/v2/entities/{id}/provenance
 * - GET /api/v2/entities/{id}/provenance?as_of=ISO_datetime
 * - GET /api/v2/admin/entities/{id}/statements (raw debug)
 */
import { api } from './api';

export interface ProvenanceStatement {
  value: string;
  original_value: string | null;
  dataset: string;
  external: boolean;
  lang: string | null;
  authority: number;
  first_seen: string;
  last_seen: string;
  origin: string | null;
}

export interface PropertyProvenance {
  prop: string;
  prop_type: string;
  merged_values: string[];
  policy: 'union' | 'source_priority' | 'first_seen' | 'union_default' | 'empty';
  conflict: boolean;
  conflict_values: string[] | null;
  winning_dataset: string | null;
  statements: ProvenanceStatement[];
}

export interface EntityProvenanceResponse {
  entity_id: string;
  canonical_id: string;
  schema: string;
  canonical_name: string;
  datasets: string[];
  is_pep: boolean;
  is_sanctioned: boolean;
  statement_count: number;
  properties: Record<string, PropertyProvenance>;
  has_conflicts: boolean;
  as_of: string | null;
}

export const provenanceService = {
  /** Fetch provenance per-property for an entity (FtM-formatted). */
  async getEntityProvenance(
    entityId: string,
    asOf?: string,
  ): Promise<EntityProvenanceResponse> {
    const params: Record<string, string> = {};
    if (asOf) params.as_of = asOf;
    const { data } = await api.get(`/api/v2/entities/${entityId}/provenance`, { params });
    return data;
  },

  /** Raw statements for debug. */
  async getRawStatements(entityId: string, byCanonical = false): Promise<any> {
    const { data } = await api.get(`/api/v2/admin/entities/${entityId}/statements`, {
      params: { by_canonical: byCanonical },
    });
    return data;
  },
};
