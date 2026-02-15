// Risk Level Enumeration
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

// Entity Types
export type EntityType = 'person' | 'company' | 'vessel' | 'aircraft' | 'organization';

// Gender Type
export type Gender = 'male' | 'female' | 'unknown';

// Source Types
export type DataSource = 
  | 'OFAC' 
  | 'UN' 
  | 'HMT' 
  | 'EU' 
  | 'DFAT' 
  | 'FINCEN' 
  | 'INTERPOL' 
  | 'WORLDCHECK' 
  | 'PEP' 
  | 'ADVERSE_MEDIA'
  | 'INTERNAL';

// Relationship Types
export type RelationshipType = 
  | 'ownership' 
  | 'family' 
  | 'employment' 
  | 'partnership' 
  | 'transaction' 
  | 'shared_address' 
  | 'shared_contact' 
  | 'legal_rep' 
  | 'beneficial_owner';

// Investigation Status
export type InvestigationStatus = 
  | 'open' 
  | 'in_progress' 
  | 'pending_review' 
  | 'closed' 
  | 'escalated';

// PEP Category
export type PepCategory = 
  | 'head_of_state' 
  | 'head_of_government' 
  | 'minister' 
  | 'member_of_parliament'
  | 'judge'
  | 'military_leader'
  | 'central_bank_head'
  | 'diplomat'
  | 'local_politician'
  | 'family_member'
  | 'close_associate';

// Sanction Program Type
export type SanctionProgram = 
  | 'SDN' 
  | 'SSI' 
  | 'CAPTA' 
  | 'FSE' 
  | 'DPL' 
  | 'DTC' 
  | 'ISIL' 
  | 'CYBER' 
  | 'HK';

// Address Interface
export interface Address {
  id: string;
  street?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  type?: 'residential' | 'business' | 'registered' | 'mailing';
  isCurrent: boolean;
  source?: DataSource;
}

// Identification Interface
export interface Identification {
  id: string;
  type: 'passport' | 'national_id' | 'tax_id' | 'drivers_license' | 'company_reg' | 'vessel_imo' | 'aircraft_tail';
  number: string;
  country?: string;
  issueDate?: string;
  expiryDate?: string;
  source?: DataSource;
}

// Alias Interface
export interface Alias {
  name: string;
  type: 'primary' | 'alias' | 'maiden_name' | 'former_name' | 'also_known_as' | 'trading_as';
  source?: DataSource;
}

// Sanction Entry Interface
export interface SanctionEntry {
  id: string;
  source: DataSource;
  program: SanctionProgram;
  listingDate: string;
  reason: string;
  status: 'active' | 'suspended' | 'removed';
  additionalInfo?: Record<string, string>;
  referenceNumber?: string;
}

// PEP Entry Interface
export interface PepEntry {
  id: string;
  category: PepCategory;
  role: string;
  country: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  source: DataSource;
  subnationalJurisdiction?: string;
}

// Adverse Media Entry Interface
export interface AdverseMediaEntry {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  publicationDate: string;
  sentiment: 'negative' | 'neutral' | 'positive';
  categories: string[];
  language: string;
}

// Relationship Interface
export interface Relationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  targetEntity?: Entity; // Populated when needed
  type: RelationshipType;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  confidence: number; // 0-100
  source: DataSource;
}

// Risk Factor Interface
export interface RiskFactor {
  category: 'sanctions' | 'pep' | 'adverse_media' | 'geographic' | 'network' | 'transactional';
  score: number; // 0-100
  level: RiskLevel;
  details?: string;
  lastUpdated: string;
}

// Investigation Note Interface
export interface InvestigationNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  type: 'general' | 'finding' | 'decision' | 'escalation';
}

// Investigation Interface
export interface Investigation {
  id: string;
  entityId: string;
  status: InvestigationStatus;
  assignedTo?: string;
  openedAt: string;
  closedAt?: string;
  notes: InvestigationNote[];
  decisions?: string[];
}

// Main Entity Interface
export interface Entity {
  id: string;
  type: EntityType;
  primaryName: string;
  aliases: Alias[];
  
  // Person-specific fields
  gender?: Gender;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationalities?: string[];
  
  // Company-specific fields
  incorporationDate?: string;
  incorporationCountry?: string;
  companyType?: string;
  status?: 'active' | 'dissolved' | 'suspended' | 'liquidated';
  
  // Common fields
  addresses: Address[];
  identifications: Identification[];
  
  // Risk Assessment
  overallRiskScore: number; // 0-100
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  
  // Data Sources
  sanctions: SanctionEntry[];
  pepEntries: PepEntry[];
  adverseMedia: AdverseMediaEntry[];
  
  // Relationships
  relationships: Relationship[];
  
  // Investigation
  investigations: Investigation[];
  
  // Metadata
  firstSeen: string;
  lastUpdated: string;
  dataSources: DataSource[];
  
  // Images
  imageUrl?: string;
}

// Search Result Interface
export interface SearchResult {
  entity: Entity;
  matchScore: number; // 0-100
  matchType: 'exact' | 'fuzzy' | 'alias' | 'phonetic' | 'partial';
  matchedField: string;
  highlightedName: string;
}

// Search Suggestion Interface
export interface SearchSuggestion {
  id: string;
  name: string;
  type: EntityType;
  riskLevel: RiskLevel;
  sources: DataSource[];
  nationality?: string;
  description?: string;
  matchScore: number;
}

// Filter Options Interface
export interface SearchFilters {
  entityTypes: EntityType[];
  riskLevels: RiskLevel[];
  sources: DataSource[];
  countries: string[];
  dateRange?: { from?: string; to?: string };
}

// Dashboard Stats Interface
export interface DashboardStats {
  totalScreened: number;
  matchesFound: number;
  highRiskMatches: number;
  pendingInvestigations: number;
  averageResponseTime: number;
  dailySearches: number;
}

// Alert Interface
export interface Alert {
  id: string;
  entityId: string;
  entityName: string;
  type: 'new_match' | 'status_change' | 'risk_increase' | 'new_sanction' | 'media_alert';
  severity: RiskLevel;
  message: string;
  createdAt: string;
  isRead: boolean;
}

// Graph Node Interface (for React Flow)
export interface GraphNode {
  id: string;
  type: 'person' | 'company' | 'vessel' | 'aircraft' | 'organization';
  position: { x: number; y: number };
  data: {
    label: string;
    entity: Entity;
    riskLevel: RiskLevel;
    isExpanded: boolean;
  };
}

// Graph Edge Interface (for React Flow)
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  data: {
    label: string;
    confidence: number;
  };
}

// Network Graph Data Interface
export interface NetworkGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Audit Log Entry Interface
export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: 'search' | 'view' | 'export' | 'investigation_created' | 'note_added' | 'decision_made';
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
}

// User Interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'analyst' | 'reviewer' | 'viewer';
  permissions: string[];
  lastLogin?: string;
  isActive: boolean;
}

// API Response Interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    total?: number;
    page?: number;
    perPage?: number;
  };
}

export interface SearchApiResponse {
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  total: number;
  page: number;
  perPage: number;
  query: string;
  filters: SearchFilters;
}
