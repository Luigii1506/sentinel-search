/**
 * ScreeningV2 — motor nomenklatura ML-scored multi-script (estilo Yente).
 *
 * Endpoints:
 * - POST /api/v2/screen/v2 (directo, response shape FtM-flavored)
 * - POST /api/v2/screen/gold con engine="v2" (backwards-compat shape v1)
 */
import { api } from './api';

export interface ScreeningV2Request {
  name: string;
  schema?: 'Person' | 'LegalEntity' | 'Organization' | 'Company' | 'Vessel' | 'Airplane';
  birth_date?: string;
  country?: string;
  id_number?: string;
  threshold?: number;
  candidate_limit?: number;
  result_limit?: number;
}

export interface ScreeningV2Match {
  entity_id: string;
  canonical_name: string;
  schema: string;
  score: number;
  features: Record<string, number>;
  datasets: string[];
  is_pep: boolean;
  is_sanctioned: boolean;
}

export interface ScreeningV2Response {
  query: string;
  query_variants: string[];
  schema: string;
  candidates_evaluated: number;
  threshold: number;
  matches: ScreeningV2Match[];
  explanation_note: string;
}

export const screeningV2Service = {
  async screen(request: ScreeningV2Request): Promise<ScreeningV2Response> {
    const { data } = await api.post('/api/v2/screen/v2', {
      threshold: 0.5,
      candidate_limit: 200,
      result_limit: 50,
      schema: 'Person',
      ...request,
    });
    return data;
  },
};
