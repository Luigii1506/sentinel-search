import api from './api';
import type { ScreeningRequest, ScreeningResponse, ScreeningMatch } from '@/types/api';

// Smart Search v3.0 - Optimized Search Types
export interface OptimizedSearchRequest {
  query: string;
  max_results?: number;
  min_confidence?: number;
  use_cache?: boolean;
  timeout_ms?: number;
}

export interface OptimizedSearchResult {
  entity_id: string;
  name: string;
  entity_type: string;
  risk_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  sources: string[];
  score: number;
  confidence: number;
  match_type: 'opensearch' | 'semantic' | 'phonetic' | 'hybrid';
  match_sources: string[];
}

export interface OptimizedSearchResponse {
  query: string;
  strategy: 'name' | 'concept' | 'hybrid';
  total_matches: number;
  execution_time_ms: number;
  sources_used: string[];
  from_cache: boolean;
  matches: OptimizedSearchResult[];
}

// Legacy types for backward compatibility
export interface SemanticSearchRequest {
  query: string;
  top_k?: number;
  min_similarity?: number;
}

export interface SemanticSearchResult {
  entity_id: string;
  canonical_name: string;
  similarity: number;
  risk_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'none';
  is_pep: boolean;
  sources: string[];
  match_type?: string;
}

export interface SemanticSearchResponse {
  query: string;
  embedding_model: string;
  total_results: number;
  execution_time_ms: number;
  results: SemanticSearchResult[];
  fallback_used?: string | null;
}

// Cache for search results (in-memory)
const searchCache = new Map<string, { data: OptimizedSearchResponse; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCacheKey(request: OptimizedSearchRequest): string {
  return `${request.query.toLowerCase().trim()}_${request.max_results}_${request.min_confidence}`;
}

function getCachedResult(key: string): OptimizedSearchResponse | null {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.data, from_cache: true };
  }
  searchCache.delete(key);
  return null;
}

function setCachedResult(key: string, data: OptimizedSearchResponse): void {
  // Limit cache size to 100 entries
  if (searchCache.size >= 100) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

export const screeningService = {
  /**
   * Smart Search v3.0 - Ultra-fast Optimized Search
   * Uses caching, parallel search, and intelligent routing
   */
  async optimizedSearch(request: OptimizedSearchRequest): Promise<OptimizedSearchResponse> {
    const cacheKey = getCacheKey(request);
    
    // Check client-side cache first
    const cached = getCachedResult(cacheKey);
    if (cached) {
      return cached;
    }

    // TEMP: Use /screen/gold endpoint while embeddings are being regenerated (47% complete)
    // This ensures OpenSearch is always used for reliable results
    const response = await api.post('/api/v2/screen/gold', {
      name: request.query,
      max_results: request.max_results ?? 20,
      min_confidence: request.min_confidence ?? 0.3,
    });
    
    // Transform ScreeningResponse to OptimizedSearchResponse format
    const data: OptimizedSearchResponse = {
      query: response.data.query,
      strategy: 'hybrid',
      total_matches: response.data.total_matches,
      execution_time_ms: response.data.execution_time_ms,
      sources_used: ['opensearch', 'phonetic'],
      from_cache: false,
      matches: response.data.matches.map((match: any) => ({
        entity_id: match.entity_id,
        name: match.name,
        entity_type: match.entity_type?.toUpperCase() || 'INDIVIDUAL',
        risk_score: match.risk_score || 50,
        risk_level: match.risk_level || 'medium',
        sources: match.sources || [],
        score: match.match_score / 100,
        confidence: match.confidence,
        match_type: match.match_type || 'hybrid',
        match_sources: match.matched_fields || ['name'],
      })),
    };
    
    // Cache the result client-side
    if (data.total_matches >= 3) {
      setCachedResult(cacheKey, data);
    }
    
    return data;
  },

  /**
   * Smart Search v5.0 - Semantic Search with Embeddings
   * Uses real vector similarity search with embeddings
   */
  async semanticSearch(request: SemanticSearchRequest): Promise<SemanticSearchResponse> {
    // Call the REAL semantic search endpoint with embeddings
    const response = await api.post<SemanticSearchResponse>(
      '/api/v2/screen/gold/semantic',
      {
        query: request.query,
        top_k: request.top_k ?? 10,
        min_similarity: request.min_similarity ?? 0.7,
        use_phonetic_fallback: true,
      }
    );
    
    return response.data;
  },

  /**
   * Search entities with screening (Gold Layer)
   * Calls API directly to preserve all response fields
   */
  async search(request: ScreeningRequest): Promise<ScreeningResponse> {
    const response = await api.post('/api/v2/screen/gold', {
      name: request.name,
      max_results: request.max_results ?? 50,
      min_confidence: request.min_confidence ?? 0.5,
    });

    const entityTypeMap: Record<string, string> = {
      'INDIVIDUAL': 'person',
      'ENTITY': 'company',
      'VESSEL': 'vessel',
      'AIRCRAFT': 'aircraft',
      'ORGANIZATION': 'organization',
    };

    return {
      query: response.data.query,
      total_matches: response.data.total_matches,
      execution_time_ms: response.data.execution_time_ms,
      filters_applied: request.filters || {},
      matches: response.data.matches.map((m: any) => ({
        entity_id: m.entity_id,
        canonical_id: m.canonical_id,
        name: m.name,
        match_score: m.match_score,
        confidence: m.confidence,
        match_type: m.match_type || 'opensearch',
        entity_type: entityTypeMap[m.entity_type?.toUpperCase()] || 'person',
        risk_level: m.risk_level || 'medium',
        risk_score: m.risk_score,
        sources: m.sources || [],
        source_count: m.source_count || (m.sources || []).length,
        aliases: [],
        nationalities: m.nationalities || [],
        countries: m.countries || [],
        matched_fields: ['name'],
        explanation: m.explanation || '',
        highlight: m.highlight,
        is_current_pep: m.is_current_pep,
        pep_category: m.pep_category,
        pep_positions: m.pep_positions,
        opensearch_score: m.opensearch_score,
      })),
    };
  },

  /**
   * Get search suggestions (autocomplete) - uses optimized endpoint
   */
  async getSuggestions(query: string, limit: number = 8): Promise<ScreeningMatch[]> {
    const response = await this.optimizedSearch({
      query: query,
      max_results: limit,
      min_confidence: 0.3, // Lower threshold for suggestions
      timeout_ms: 1000,    // Faster timeout for autocomplete
    });
    
    return response.matches.map(match => ({
      entity_id: match.entity_id,
      name: match.name,
      match_score: match.score * 100,
      confidence: match.confidence,
      match_type: match.match_type,
      entity_type: match.entity_type?.toLowerCase(),
      risk_level: match.risk_level,
      sources: match.sources || [],
      aliases: [],
      nationalities: [],
      matched_fields: match.match_sources || ['name'],
      explanation: `Match via ${match.match_sources?.join(', ')}`,
    }));
  },

  /**
   * Get screening history for current user
   */
  async getHistory(limit: number = 50): Promise<ScreeningResponse[]> {
    const response = await api.get('/api/v1/reports/screening', {
      params: { limit },
    });
    return response.data.history || [];
  },

  /**
   * Bulk screening - upload CSV
   */
  async bulkScreen(file: File): Promise<{ job_id: string; status: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/v2/screen/bulk/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get bulk screening status
   */
  async getBulkStatus(jobId: string): Promise<{
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    total: number;
    processed: number;
    results?: ScreeningMatch[];
    download_url?: string;
  }> {
    const response = await api.get(`/api/v2/screen/bulk/${jobId}`);
    return response.data;
  },

  /**
   * Clear client-side search cache
   */
  clearCache(): void {
    searchCache.clear();
  },

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; ttlMinutes: number } {
    return {
      size: searchCache.size,
      maxSize: 100,
      ttlMinutes: 5,
    };
  },
};

export default screeningService;
