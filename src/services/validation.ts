import api from './api';

// ── Types ──

export interface ValidationAlert {
  id: string;
  entity_id: string;
  canonical_name: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggested_action?: string;
  status: 'open' | 'in_review' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface ValidationAlertsListResponse {
  count: number;
  status_filter: string;
  severity_filter: string | null;
  alerts: ValidationAlert[];
}

export interface ValidationStats {
  alerts_by_status: Record<string, number>;
  open_by_severity: Record<string, number>;
  open_by_alert_type: Record<string, number>;
  evidence_by_decision: Record<string, number>;
  total_entities_audited: number;
}

export interface PepPosition {
  cargo?: string;
  name?: string;
  source?: string;
  source_dataset?: string;
  estado?: string;
  country?: string;
  partido?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  dependencia?: string;
  pep_category?: string;
}

export interface EvidenceRecord {
  id: string;
  role_claim?: string;
  claim_type: string;
  decision: string;
  confidence: number;
  reasoning?: string;
  sources_supporting: Array<{ source_id: string; weight: number; evidence: string }>;
  sources_contradicting: Array<{ source_id: string; weight: number; evidence: string }>;
  decided_by: string;
  decided_at: string;
}

export interface EntityEvidenceResponse {
  entity: {
    id: string;
    canonical_name: string;
    is_pep: boolean;
    pep_positions: PepPosition[];
    identifiers?: Record<string, any>;
    countries?: string[];
  };
  evidence: EvidenceRecord[];
  alerts: ValidationAlert[];
}

// ── API methods ──

export const validationService = {
  async listAlerts(params: {
    status?: 'open' | 'in_review' | 'resolved' | 'dismissed';
    severity?: 'critical' | 'high' | 'medium' | 'low';
    limit?: number;
  } = {}): Promise<ValidationAlertsListResponse> {
    const response = await api.get('/api/v2/admin/validation/alerts', {
      params: {
        status: params.status || 'open',
        severity: params.severity,
        limit: params.limit || 50,
      },
    });
    return response.data;
  },

  async getStats(): Promise<ValidationStats> {
    const response = await api.get('/api/v2/admin/validation/alerts/stats');
    return response.data;
  },

  async getEntityEvidence(entityId: string, limit = 50): Promise<EntityEvidenceResponse> {
    const response = await api.get(`/api/v2/admin/validation/evidence/${entityId}`, {
      params: { limit },
    });
    return response.data;
  },

  async resolveAlert(
    alertId: string,
    resolution: 'quarantine' | 'accept' | 'dismiss' | 'edit',
    notes = '',
    resolvedBy = 'operator',
  ): Promise<{ status: string; alert_id: string; resolution: string }> {
    const response = await api.post(
      `/api/v2/admin/validation/alerts/${alertId}/resolve`,
      null,
      { params: { resolution, notes, resolved_by: resolvedBy } },
    );
    return response.data;
  },
};
