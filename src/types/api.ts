// API Request/Response Types

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'analyst' | 'reviewer' | 'viewer';
  permissions: string[];
  is_active: boolean;
  last_login?: string;
}

// Screening Types (matching backend)
export interface ScreeningRequest {
  name: string;
  entity_type?: 'person' | 'company' | 'vessel' | 'aircraft' | 'organization';
  min_confidence?: number;
  max_results?: number;
  source_level?: 1 | 2 | 3 | 4 | 5;
  filters?: {
    sources?: string[];
    countries?: string[];
    risk_levels?: string[];
  };
}

export interface SanctionDetail {
  authority: string;
  program: string;
  reason?: string;
  start_date?: string;
  end_date?: string;
}

export interface ScreeningMatch {
  entity_id: string;
  canonical_id?: string;
  name: string;
  match_score: number;
  confidence: number; // 0-1
  match_type: 'exact' | 'fuzzy' | 'alias' | 'phonetic' | 'partial' | 'opensearch' | 'semantic' | 'hybrid';
  entity_type: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'none';
  risk_score?: number;
  sources: string[];
  source_count?: number;
  aliases?: string[];
  nationalities?: string[];
  countries?: string[];
  date_of_birth?: string;
  birth_date?: string; // Alternative field from API
  gender?: string;
  topics?: string[];
  identifiers?: Record<string, string>;
  sanctions_details?: SanctionDetail[];
  addresses?: (string | { address: string; country?: string })[];
  entity_subtype?: string;
  matched_fields?: string[];
  explanation?: string;
  matched_name?: string;
  highlight?: string;
  is_current_pep?: boolean;
  pep_category?: string;
  pep_positions?: unknown[];
  opensearch_score?: number;
  // Adverse Media (Tier 1)
  has_adverse_media?: boolean;
  adverse_media_categories?: string[];
  adverse_media_severity?: number;
  adverse_media_details?: Array<{
    category: string;
    severity: number;
    details: string;
  }>;
  // Wikidata bilingual enrichment
  display_name?: string;
  description?: string;
  nationalities_display?: string[];
  place_of_birth?: string;
  education?: string[];
  political?: string[];
  positions?: string[];
  // Freshness / Risk Decay
  freshness_factor?: number;
  days_since_update?: number | null;
  // ML Reranker v3.5 (Level 5)
  ml_probability?: number;
  pre_ml_score?: number;
  ml_features?: {
    weighted_token_score?: number;
    surname_match_ratio?: number;
    avg_jaro_similarity?: number;
    order_similarity?: number;
    country_match?: number;
    sanctions_flag?: number;
    token_rarity?: number;
  };
  explainability?: {
    text_score_components?: {
      weighted_token_score?: number;
      avg_jaro_similarity?: number;
      order_similarity?: number;
      opensearch_contribution?: number;
    };
    structural_analysis?: {
      tokens_matched?: string;
      surnames_matched?: boolean;
      surname_match_ratio?: number;
    };
    penalties_applied?: Record<string, string>;
    boosts_applied?: Record<string, string>;
    final_calculation?: {
      raw_score?: number;
      match_percentage?: number;
    };
    ml_component?: {
      ml_probability?: number;
      pre_ml_contribution?: number;
      ml_contribution?: number;
      final_score_formula?: string;
    };
  };
  context_breakdown?: {
    text_score?: number;
    country_boost?: number;
    temporal_boost?: number;
    position_boost?: number;
    sanctions_boost?: number;
    context_score?: number;
    risk_component?: number;
    pre_ml_score?: number;
  };
}

export interface ScreeningResponse {
  query: string;
  total_matches: number;
  matches: ScreeningMatch[];
  execution_time_ms: number;
  filters_applied: Record<string, unknown>;
}

// Entity Types (from backend)
export interface APIEntity {
  id: string;
  primary_name: string;
  entity_type: 'person' | 'company' | 'vessel' | 'aircraft' | 'organization';
  country?: string;

  // Person fields
  gender?: 'male' | 'female' | 'unknown';
  date_of_birth?: string;
  birth_date?: string;
  place_of_birth?: string;
  nationalities?: string[];
  education?: string | string[];
  religion?: string | string[];
  political?: string | string[];
  ethnicity?: string | string[];
  positions_held?: string[];
  source_metadata?: Record<string, unknown>;

  // Company fields
  incorporation_date?: string;
  incorporation_country?: string;
  company_type?: string;
  status?: 'active' | 'dissolved' | 'suspended' | 'liquidated';

  // Common
  aliases: APIAlias[];
  addresses: APIAddress[];
  identifications: APIIdentification[];

  // Risk
  overall_risk_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'none';
  risk_factors: APIRiskFactor[];

  // Sources
  sanctions: APISanctionEntry[];
  pep_entries: APIPepEntry[];
  adverse_media: APIAdverseMediaEntry[];
  source_records?: APISourceRecord[];
  
  // Enriched fields
  topics?: string[];
  identifiers?: Record<string, string>;
  sanctions_details?: SanctionDetail[];

  // PEP
  is_current_pep?: boolean;
  pep_category?: string;

  // Metadata
  first_seen: string;
  last_updated: string;
  data_sources: string[];
  data_sources_display?: Array<{
    id: string;
    display_name: string;
    category: string;
  }>;
}

export interface APIAlias {
  name: string;
  type: 'primary' | 'alias' | 'maiden_name' | 'former_name' | 'also_known_as' | 'trading_as';
  source?: string;
}

export interface APIAddress {
  street?: string;
  city?: string;
  state?: string;
  country: string;
  postal_code?: string;
  type?: 'residential' | 'business' | 'registered' | 'mailing';
  is_current: boolean;
}

export interface APIIdentification {
  type: 'passport' | 'national_id' | 'tax_id' | 'drivers_license' | 'company_reg' | 'vessel_imo' | 'aircraft_tail';
  number: string;
  country?: string;
  label?: string;
  issue_date?: string;
  expiry_date?: string;
}

export interface APIRiskFactor {
  category: 'sanctions' | 'pep' | 'adverse_media' | 'geographic' | 'network' | 'transactional';
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low' | 'none';
  details?: string;
  last_updated: string;
}

export interface APISanctionEntry {
  id: string;
  source: string;
  program: string;
  listing_date: string;
  reason: string;
  status: 'active' | 'suspended' | 'removed';
  reference_number?: string;
  details?: {
    rfc?: string;
    dataset?: string;
    dataset_label?: string;
    riesgo?: string;
    supuesto?: string;
    monto?: string;
    fecha_publicacion?: string;
    entidad_federativa?: string;
    tipo_persona?: string;
    datasets?: Array<Record<string, unknown>>;
    dataset_count?: number;
  };
}

export interface APIPepEntry {
  id: string;
  category: string;
  role: string;
  country: string;
  institution?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  party?: string;
  department?: string;
  state?: string;
  source?: string;
}

export interface APISourceRecord {
  source: string;
  source_display?: string;
  category?: string;
  external_id?: string;
  programs?: string[];
  country?: string;
  risk_level?: string;
  details?: Record<string, unknown>;
}

export interface APIAdverseMediaEntry {
  id: string;
  title: string;
  summary: string;
  source: string;
  publication_date: string;
  categories: string[];
}

// Graph Types (API v2)
export interface NetworkNode {
  id: string;
  name: string;
  entity_type: string;
  risk_level: string;
  risk_score?: number;
  is_pep?: boolean;
  countries?: string[];
  topics?: string[];
  source_count?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: string;
  subtype?: string;
  label?: string;
  properties?: Record<string, unknown>;
  dashed?: boolean;
}

export interface NetworkData {
  center: NetworkNode;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  depth: number;
  total_nodes: number;
  total_edges: number;
  available_filters?: string[];
}

// Legacy Graph Types (for compatibility)
export interface GraphRelationship {
  source_id: string;
  target_id: string;
  target_name?: string;
  type: string;
  description?: string;
  confidence: number;
  is_current: boolean;
}

export interface GraphData {
  entity: APIEntity;
  relationships: GraphRelationship[];
  related_entities: APIEntity[];
}

// Admin Types
export interface DashboardStats {
  total_entities: number;
  total_screened: number;
  matches_found: number;
  high_risk_matches: number;
  pending_investigations: number;
  average_response_time: number;
  daily_searches: number;
}

export interface SourceInfo {
  source_id: string;
  display_name: string;
  category: string;
  country?: string;
  bronze_count: number;
  silver_count: number;
  gold_count: number;
  last_sync?: string;
  status: 'active' | 'pending' | 'error' | 'stale';
  risk_score: number;
  is_pep: boolean;
  // URLs
  source_url?: string;
  os_url?: string;
  os_data_url?: string;
  // OpenSanctions
  has_opensanctions: boolean;
  os_dataset?: string;
  // Importer/Schedule
  importer_type?: string;
  schedule_frequency?: string;
  queue?: string;
}

export interface SourceDetail {
  source_id: string;
  display_name: string;
  category: string;
  country?: string;
  status: string;
  
  // URLs
  source_url?: string;
  source_url_status?: string;
  
  // OpenSanctions
  has_opensanctions: boolean;
  os_config?: Record<string, unknown>;
  os_entities_expected?: number;
  os_entities_actual: number;
  os_last_sync?: string;
  
  // Scraper
  scraper_enabled: boolean;
  scraper_config?: Record<string, unknown>;
  scraper_last_run?: string;
  scraper_status?: string;
  
  // Conteos
  bronze_count: number;
  silver_count: number;
  gold_count: number;
  
  // Historial
  recent_jobs: Array<{
    id: string;
    status: string;
    started_at?: string;
    finished_at?: string;
    records_inserted: number;
    error_message?: string;
  }>;
  
  // Métricas
  last_sync?: string;
  data_freshness_days?: number;
  error_count_7d: number;
  success_count_7d: number;
}

export interface SourceSummary {
  total_registered: number;
  total_with_data: number;
  total_bronze: number;
  total_silver: number;
  total_gold: number;
  by_category: Record<string, number>;
  by_country: Record<string, number>;
  by_status: Record<string, number>;
  sources: SourceInfo[];
}

export interface JobInfo {
  id: string;
  source: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'completed';
  job_type: string;
  started_at?: string;
  finished_at?: string;
  records_inserted: number;
  records_processed: number;
  records_updated: number;
  records_failed: number;
  error_message?: string;
  elapsed_seconds?: number;
}

export interface JobsResponse {
  running: JobInfo[];
  recent: JobInfo[];
  stats: Record<string, number>;
}

export interface SystemHealth {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
  services: {
    api: { status: string };
    database: { status: string; latency_ms: number };
    redis: { status: string; latency_ms: number };
    opensearch: { status: string; latency_ms: number; cluster_name?: string };
  };
}

export interface RedisDurabilityStatus {
  connected: boolean;
  ping: boolean;
  appendonly?: string;
  appendfsync?: string;
  save?: string;
  aof_enabled: boolean;
  rdb_enabled: boolean;
  loading?: boolean;
  last_save_time?: number | null;
  notes: string[];
}

export interface FreshnessViolation {
  source_id: string;
  display_name: string;
  tier: number;
  slo_hours: number;
  age_hours: number;
  status: string;
  last_sync?: string | null;
  queue?: string;
  provider?: string;
}

export interface FreshnessSloResponse {
  evaluated_at: string;
  total_sources: number;
  total_breached: number;
  total_never_synced: number;
  tiers: Record<string, {
    sources: number;
    within_slo: number;
    breached: number;
    never_synced: number;
    slo_hours: number;
  }>;
  sources: FreshnessViolation[];
  violations: FreshnessViolation[];
}

export interface DataQualityReportResponse {
  evaluated_at: string;
  counts: {
    bronze: number;
    silver: number;
    gold: number;
    gold_screenable: number;
    mappings: number;
    silver_unmapped: number;
  };
  ratios: {
    mapping_coverage: number;
    gold_dedup: number;
    raw_to_silver: number;
  };
  health: {
    mapping_coverage_status: string;
    dedup_status: string;
  };
}

export interface DataQualityBySourceEntry {
  source_id: string;
  counts: {
    bronze: number;
    silver: number;
    mapped: number;
    gold: number;
    silver_unmapped: number;
  };
  ratios: {
    mapping_coverage: number;
    gold_dedup: number;
    raw_to_silver: number;
  };
  health: {
    mapping_coverage_status: string;
  };
}

export interface DataQualityBySourceResponse {
  evaluated_at: string;
  total_sources: number;
  sources: DataQualityBySourceEntry[];
}

export interface FalsePositiveSample {
  id: string;
  created_at: string;
  label: string;
  query_name: string;
  matched_entity_id: string;
  matched_entity_name: string;
  match_confidence: number;
  match_type: string;
  entity_risk_score?: number | null;
  source_count?: number | null;
  entity_sources: string[];
  alert_id?: string | null;
}

export interface FalsePositiveSamplingReport {
  evaluated_at: string;
  period_days: number;
  total_feedback: number;
  false_positive_count: number;
  true_positive_count: number;
  fp_rate: number;
  high_confidence_false_positive_count: number;
  low_confidence_true_positive_count: number;
  samples: Record<string, FalsePositiveSample[]>;
}

export interface SearchSyncDlqEntry {
  entity_id: string;
  action: string;
  attempts: number;
  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SearchSyncDlqResponse {
  dead_letters: SearchSyncDlqEntry[];
  total: number;
}

export interface TaskDlqEntry {
  id: string;
  task_name: string;
  source: string;
  step: string;
  queue?: string | null;
  error_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  payload: Record<string, unknown>;
  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  requeued_at?: string | null;
  resolved_at?: string | null;
}

export interface TaskDlqResponse {
  stats: Record<string, number>;
  dead_letters: TaskDlqEntry[];
}

export interface DisappearedSourceCandidate {
  source_id: string;
  consecutive_failures: number;
  last_failure_at?: string | null;
  sample_errors: string[];
}

export interface DisappearedSourceEntry {
  source_id: string;
  status: string;
  error_message?: string | null;
  last_sync?: string | null;
  updated_at?: string | null;
}

export interface DisappearedSourcesAuditResponse {
  evaluated_at: string;
  period_days: number;
  min_failures: number;
  total_candidates: number;
  candidates: DisappearedSourceCandidate[];
  marked_disappeared: DisappearedSourceEntry[];
}

export interface SourceLifecycleEvent {
  id: string;
  source_id: string;
  event_type: string;
  entity_source_id?: string | null;
  triggered_by: string;
  reason?: string | null;
  event_metadata: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SourceLifecycleEventsResponse {
  total_events: number;
  events: SourceLifecycleEvent[];
}

export interface SystemCounts {
  bronze: number;
  silver: number;
  gold: number;
}

export interface HealthDetailed {
  status: string;
  components: {
    database?: { status: string };
    opensearch?: { status: string };
    redis?: { status: string };
  };
  counts: {
    bronze: number;
    silver: number;
    gold: number;
  };
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_id?: string;
  entity_name?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  ip_address?: string;
}

// Merge Review Types
export interface MergeChildInfo {
  silver_id: string;
  source: string;
  external_id?: string;
  name?: string;
  name_normalized?: string;
  match_method?: string;
  match_confidence?: number;
  matched_at?: string;
}

export interface MergedEntitySummary {
  entity_id: string;
  canonical_name: string;
  entity_type?: string;
  risk_score: number;
  all_sources: string[];
  source_count: number;
  all_names: string[];
  countries?: string[];
  birth_date?: string;
  is_current_pep?: boolean;
  pep_category?: string;
  mapping_count: number;
  merge_methods: string[];
  min_confidence?: number;
  max_confidence?: number;
  avg_confidence?: number;
  last_merged_at?: string;
}

export interface MergedEntityDetail extends MergedEntitySummary {
  children: MergeChildInfo[];
}

export type MergeReviewSortBy =
  | 'confidence_asc'
  | 'confidence_desc'
  | 'sources_desc'
  | 'recent'
  | 'name_asc';

export interface MergeReviewMeta {
  elapsed_ms?: number;
  [key: string]: unknown;
}

export interface MergeReviewResponse {
  total: number;
  offset: number;
  limit: number;
  entities: MergedEntitySummary[];
  stats: Record<string, number>;
  meta?: MergeReviewMeta;
  _meta?: MergeReviewMeta;
}

// API Error Response
export interface APIError {
  detail: string;
  code?: string;
  errors?: Record<string, string[]>;
}
