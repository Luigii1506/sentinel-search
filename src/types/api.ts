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
  filters?: {
    sources?: string[];
    countries?: string[];
    risk_levels?: string[];
  };
}

export interface ScreeningMatch {
  entity_id: string;
  name: string;
  match_score: number;
  confidence: number; // 0-1
  match_type: 'exact' | 'fuzzy' | 'alias' | 'phonetic' | 'partial';
  entity_type: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'none';
  sources: string[];
  aliases?: string[];
  nationalities?: string[];
  date_of_birth?: string;
  matched_fields: string[];
  explanation?: string;
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
  
  // Person fields
  gender?: 'male' | 'female' | 'unknown';
  date_of_birth?: string;
  place_of_birth?: string;
  nationalities?: string[];
  
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
  
  // Metadata
  first_seen: string;
  last_updated: string;
  data_sources: string[];
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
}

export interface APIPepEntry {
  id: string;
  category: string;
  role: string;
  country: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
}

export interface APIAdverseMediaEntry {
  id: string;
  title: string;
  summary: string;
  source: string;
  publication_date: string;
  categories: string[];
}

// Graph Types
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

// API Error Response
export interface APIError {
  detail: string;
  code?: string;
  errors?: Record<string, string[]>;
}
