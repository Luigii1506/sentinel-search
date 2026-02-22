import api from './api';
import type { ScreeningRequest, ScreeningResponse, ScreeningMatch } from '@/types/api';

export const screeningService = {
  /**
   * Search entities with screening (Gold Layer)
   */
  async search(request: ScreeningRequest): Promise<ScreeningResponse> {
    const response = await api.post('/api/v2/screen/gold', {
      name: request.name,
      entity_type: request.entity_type,
      min_confidence: request.min_confidence ?? 0.5,
      max_results: request.max_results ?? 50,
    });
    
    // Transform Gold API response to frontend format
    const data = response.data;
    return {
      query: data.query,
      total_matches: data.total_matches,
      execution_time_ms: data.execution_time_ms,
      filters_applied: request.filters || {},
      matches: data.matches.map((match: any) => ({
        entity_id: match.entity_id || match.canonical_id,
        name: match.name,
        match_score: match.match_score,
        confidence: match.confidence,
        match_type: match.match_type,
        entity_type: match.entity_type?.toLowerCase(),
        risk_level: match.risk_level,
        sources: match.sources || [],
        aliases: match.aliases || [],
        nationalities: match.nationalities || [],
        date_of_birth: match.date_of_birth,
        matched_fields: match.matched_fields || ['name'],
        explanation: match.explanation,
      })),
    };
  },

  /**
   * Get search suggestions (autocomplete) - uses same gold endpoint with smaller limit
   */
  async getSuggestions(query: string, limit: number = 8): Promise<ScreeningMatch[]> {
    const response = await api.post('/api/v2/screen/gold', {
      name: query,
      min_confidence: 0.3, // Lower threshold for suggestions
      max_results: limit,
    });
    
    const data = response.data;
    return data.matches.map((match: any) => ({
      entity_id: match.entity_id || match.canonical_id,
      name: match.name,
      match_score: match.match_score,
      confidence: match.confidence,
      match_type: match.match_type,
      entity_type: match.entity_type?.toLowerCase(),
      risk_level: match.risk_level,
      sources: match.sources || [],
      aliases: match.aliases || [],
      nationalities: match.nationalities || [],
      date_of_birth: match.date_of_birth,
      matched_fields: match.matched_fields || ['name'],
      explanation: match.explanation,
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
};

export default screeningService;
