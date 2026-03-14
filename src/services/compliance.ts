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

export interface ComplianceReport {
  period_days: number;
  generated_at: string;
  alerts: {
    total: number;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
  };
  cases: {
    total: number;
    by_status: Record<string, number>;
    closed: number;
    sla_breached: number;
    sla_compliance_pct: number;
    avg_resolution_hours: number | null;
    sar_filed: number;
  };
  decisions: {
    total: number;
    true_positive: number;
    false_positive: number;
    fp_rate_pct: number;
  };
  monitoring: {
    watchlist_active: number;
    whitelist_active: number;
  };
  top_entities: Array<{
    name: string;
    alert_count: number;
    max_risk: number;
  }>;
}

// ── Adverse Media Types ──

export interface AdverseMediaArticle {
  id: string;
  title: string;
  summary: string | null;
  source?: string;
  source_url: string;
  publication_date: string | null;
  sentiment: string | null;
  categories: string[];
  primary_category: string | null;
  severity: number;
  language: string | null;
  link_confidence?: number;
  is_verified?: boolean;
  mentioned_name?: string;
  classification_method?: string;
  classification_confidence?: number;
}

export interface AdverseMediaRiskProfile {
  article_risk_score: number;
  max_severity: number;
  total_articles: number;
  recent_30d: number;
  top_categories: string[];
}

export interface AdverseMediaEntityResponse {
  entity_id: string;
  structured_media: {
    has_adverse_media: boolean;
    total_hits: number;
    max_severity: number;
    categories: Array<{ category: string; severity: number; details: string }>;
  } | null;
  articles: {
    total: number;
    items: AdverseMediaArticle[];
  };
  risk_profile: AdverseMediaRiskProfile;
}

export interface AdverseMediaStats {
  total_articles: number;
  classified: number;
  unclassified: number;
  adverse: number;
  adverse_rate_pct: number;
  total_entity_links: number;
  entities_with_articles: number;
  by_category: Record<string, number>;
  active_sources: number;
  by_method: Record<string, number>;
  by_day: Array<{ date: string; count: number }>;
}

export interface AdverseMediaSource {
  id: string;
  source_key: string;
  display_name: string;
  source_type: string;
  base_url: string | null;
  quality_score: number;
  language: string;
  is_active: boolean;
  last_crawled_at: string | null;
  total_articles: number;
  error_count: number;
  crawl_config: Record<string, unknown> | null;
}

export interface ArticleEntityLink {
  id: string;
  unified_entity_id: string;
  mentioned_name: string;
  match_confidence: number;
  match_method: string;
  is_primary_subject: boolean;
  verified: boolean;
}

export interface ArticleDetail {
  id: string;
  title: string;
  summary: string | null;
  content_snippet: string | null;
  source_url: string;
  source: string | null;
  source_display_name: string | null;
  publication_date: string | null;
  language: string | null;
  authors: string[];
  sentiment: string | null;
  categories: string[];
  primary_category: string | null;
  severity: number;
  classification_method: string | null;
  classification_confidence: number | null;
  extracted_entities: Array<{ name: string; type: string }>;
  entity_links: ArticleEntityLink[];
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

  // Adverse Media (Tier 2 — articles API)
  async getAdverseMediaProfile(entityId: string): Promise<AdverseMediaEntityResponse> {
    const response = await api.get(`/api/v2/adverse-media/entity/${entityId}`);
    return response.data;
  },

  async searchAdverseMedia(params?: {
    query?: string;
    categories?: string[];
    min_severity?: number;
    language?: string;
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: AdverseMediaArticle[] }> {
    const response = await api.post('/api/v2/adverse-media/search', params);
    return response.data;
  },

  async getAdverseMediaStats(): Promise<AdverseMediaStats> {
    const response = await api.get('/api/v2/adverse-media/stats');
    return response.data;
  },

  async getAdverseMediaSources(): Promise<{ sources: AdverseMediaSource[] }> {
    const response = await api.get('/api/v2/adverse-media/sources');
    return response.data;
  },

  async triggerCrawl(sourceKey: string): Promise<{ message: string; task_id?: string }> {
    const response = await api.post(`/api/v2/adverse-media/crawl/${sourceKey}`);
    return response.data;
  },

  async reclassifyArticles(): Promise<{ total: number; reclassified: number; adverse: number }> {
    const response = await api.post('/api/v2/adverse-media/admin/reclassify');
    return response.data;
  },

  async getArticleDetail(articleId: string): Promise<ArticleDetail> {
    const response = await api.get(`/api/v2/adverse-media/articles/${articleId}`);
    return response.data;
  },

  async createAlertFromArticle(data: {
    article_id: string;
    entity_id: string;
    entity_name: string;
    article_title: string;
    severity: number;
    categories: string[];
  }): Promise<{ alert_id: string; case_id: string; case_number: string; message: string }> {
    const response = await api.post('/api/v2/compliance/alerts/from-match', {
      query_name: data.article_title,
      entity_id: data.entity_id,
      entity_name: data.entity_name,
      match_confidence: 0.8,
      match_type: 'adverse_media',
      risk_score: data.severity,
      sources: data.categories,
    });
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

  // Reports
  async getComplianceReport(days = 30): Promise<ComplianceReport> {
    const response = await api.get('/api/v2/compliance/reports', { params: { days } });
    return response.data;
  },

  // SAR
  async getSARReport(caseId: string): Promise<Record<string, unknown>> {
    const response = await api.get(`/api/v2/compliance/cases/${caseId}/sar-report`);
    return response.data;
  },

  async fileSAR(caseId: string, sarReference: string): Promise<Record<string, unknown>> {
    const response = await api.post(`/api/v2/compliance/cases/${caseId}/file-sar`, {
      sar_reference: sarReference,
    });
    return response.data;
  },

  // Create alert from screening match (explicit analyst action)
  async createAlertFromMatch(data: {
    query_name: string;
    entity_id: string;
    entity_name: string;
    match_confidence: number;
    match_type?: string;
    risk_score: number;
    sources: string[];
  }): Promise<{ alert_id: string; case_id: string; case_number: string; message: string }> {
    const response = await api.post('/api/v2/compliance/alerts/from-match', data);
    return response.data;
  },
};

export default complianceService;
