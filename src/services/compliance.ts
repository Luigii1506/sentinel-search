import api from './api';

// ── Types ──

export interface ComplianceCase {
  id: string;
  case_number: string;
  status: string;
  priority: string;
  title: string;
  description?: string;
  entity_id?: string;
  entity_name?: string;
  client_name?: string;
  risk_level?: string;
  risk_score?: number;
  assigned_to?: string;
  sla_deadline?: string;
  sla_breached: boolean;
  sar_filed: boolean;
  tags: string[];
  alerts_count: number;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface ComplianceAlert {
  id: string;
  case_id?: string;
  status: string;
  severity: string;
  query_name: string;
  matched_entity_id: string;
  matched_entity_name: string;
  match_confidence: number;
  match_type?: string;
  entity_risk_score?: number;
  entity_risk_level?: string;
  matched_sources: string[];
  alert_type: string;
  decision?: string;
  decided_at?: string;
  decision_reason?: string;
  created_at: string;
}

export interface WhitelistEntry {
  id: string;
  query_name_normalized: string;
  suppressed_entity_id: string;
  suppressed_entity_name: string;
  client_name?: string;
  reason: string;
  expires_at?: string;
  is_permanent: boolean;
  created_at?: string;
}

export interface WatchlistEntry {
  id: string;
  entity_name: string;
  entity_type?: string;
  external_reference?: string;
  client_name?: string;
  monitoring_frequency: string;
  source_level?: number;
  min_confidence: number;
  last_screened_at?: string;
  next_screen_at?: string;
  last_match_count: number;
  total_screenings: number;
  last_risk_level?: string;
  has_active_alerts: boolean;
  created_at: string;
}

export interface FPStats {
  period_days: number;
  total_decisions: number;
  true_positives: number;
  false_positives: number;
  fp_rate: number;
  tp_rate: number;
  top_fp_entities: Array<{ entity_name: string; fp_count: number }>;
  active_whitelist_entries: number;
}

export interface ComplianceDashboard {
  cases: {
    total: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    open_cases: number;
    sla_breached: number;
    avg_resolution_hours?: number;
  };
  monitoring: {
    total_watched: number;
    by_frequency: Record<string, number>;
    with_active_alerts: number;
    screened_last_24h: number;
  };
  false_positives: FPStats;
}

// ── Service ──

export const complianceService = {
  // Dashboard
  async getDashboard(): Promise<ComplianceDashboard> {
    const response = await api.get('/api/v2/compliance/dashboard');
    return response.data;
  },

  // Cases
  async listCases(params?: {
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ cases: ComplianceCase[]; total: number }> {
    const response = await api.get('/api/v2/compliance/cases', { params });
    return response.data;
  },

  async getCase(caseId: string): Promise<ComplianceCase & {
    alerts: ComplianceAlert[];
    decisions: Array<Record<string, unknown>>;
    notes: Array<Record<string, unknown>>;
    timeline: Array<Record<string, unknown>>;
  }> {
    const response = await api.get(`/api/v2/compliance/cases/${caseId}`);
    return response.data;
  },

  async createCase(data: {
    title: string;
    entity_id?: string;
    entity_name?: string;
    priority?: string;
    description?: string;
    tags?: string[];
  }): Promise<ComplianceCase> {
    const response = await api.post('/api/v2/compliance/cases', data);
    return response.data;
  },

  async updateCaseStatus(caseId: string, status: string, resolution?: string): Promise<ComplianceCase> {
    const response = await api.patch(`/api/v2/compliance/cases/${caseId}/status`, { status, resolution });
    return response.data;
  },

  async makeDecision(caseId: string, data: {
    alert_id: string;
    decision: 'true_positive' | 'false_positive' | 'escalate' | 'inconclusive';
    reason: string;
    evidence?: Record<string, unknown>;
  }): Promise<{ id: string; decision: string; whitelist_created: boolean }> {
    const response = await api.post(`/api/v2/compliance/cases/${caseId}/decisions`, data);
    return response.data;
  },

  async addNote(caseId: string, content: string, isInternal = true): Promise<Record<string, unknown>> {
    const response = await api.post(`/api/v2/compliance/cases/${caseId}/notes`, {
      content, is_internal: isInternal,
    });
    return response.data;
  },

  // Alerts
  async listAlerts(params?: {
    status?: string;
    severity?: string;
    case_id?: string;
    unassigned?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: ComplianceAlert[]; total: number }> {
    const response = await api.get('/api/v2/compliance/alerts', { params });
    return response.data;
  },

  // Whitelist
  async listWhitelist(params?: {
    client_name?: string;
    entity_id?: string;
    include_expired?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: WhitelistEntry[]; total: number }> {
    const response = await api.get('/api/v2/compliance/whitelist', { params });
    return response.data;
  },

  async addToWhitelist(data: {
    query_name: string;
    suppressed_entity_id: string;
    suppressed_entity_name: string;
    reason: string;
    client_name?: string;
    expires_days?: number;
    is_permanent?: boolean;
  }): Promise<WhitelistEntry> {
    const response = await api.post('/api/v2/compliance/whitelist', data);
    return response.data;
  },

  async removeFromWhitelist(id: string): Promise<void> {
    await api.delete(`/api/v2/compliance/whitelist/${id}`);
  },

  async getFPStats(days = 30): Promise<FPStats> {
    const response = await api.get('/api/v2/compliance/whitelist/stats', { params: { days } });
    return response.data;
  },

  // Watchlist
  async listWatchlist(params?: {
    client_name?: string;
    frequency?: string;
    has_alerts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: WatchlistEntry[]; total: number }> {
    const response = await api.get('/api/v2/compliance/watchlist', { params });
    return response.data;
  },

  async addToWatchlist(data: {
    entity_name: string;
    entity_type?: string;
    monitoring_frequency?: string;
    source_level?: number;
    min_confidence?: number;
    client_name?: string;
    external_reference?: string;
  }): Promise<WatchlistEntry> {
    const response = await api.post('/api/v2/compliance/watchlist', data);
    return response.data;
  },

  async removeFromWatchlist(id: string): Promise<void> {
    await api.delete(`/api/v2/compliance/watchlist/${id}`);
  },

  async getWatchlistStats(): Promise<Record<string, unknown>> {
    const response = await api.get('/api/v2/compliance/watchlist/stats');
    return response.data;
  },

  // Adverse Media
  async getAdverseMediaProfile(entityId: string): Promise<Record<string, unknown>> {
    const response = await api.get(`/api/v2/compliance/adverse-media/${entityId}`);
    return response.data;
  },

  async searchAdverseMedia(params?: {
    categories?: string;
    min_severity?: number;
    country?: string;
    limit?: number;
    offset?: number;
  }): Promise<Record<string, unknown>> {
    const response = await api.get('/api/v2/compliance/adverse-media', { params });
    return response.data;
  },

  async getAdverseMediaStats(): Promise<Record<string, unknown>> {
    const response = await api.get('/api/v2/compliance/adverse-media/stats');
    return response.data;
  },

  // Network Risk
  async getNetworkRisk(entityId: string): Promise<Record<string, unknown>> {
    const response = await api.get(`/api/v2/compliance/network-risk/${entityId}`);
    return response.data;
  },

  async getUBOAnalysis(entityId: string): Promise<Record<string, unknown>> {
    const response = await api.get(`/api/v2/compliance/ubo/${entityId}`);
    return response.data;
  },
};

export default complianceService;
