import api from './api';
import type { ScreeningRequest, ScreeningResponse, ScreeningMatch } from '@/types/api';

export const screeningService = {
  /**
   * Search entities with screening
   */
  async search(request: ScreeningRequest): Promise<ScreeningResponse> {
    const response = await api.post('/api/v2/screen/check', request);
    return response.data;
  },

  /**
   * Get search suggestions (autocomplete)
   */
  async getSuggestions(query: string, limit: number = 8): Promise<ScreeningMatch[]> {
    const response = await api.get('/api/v2/screen/autocomplete', {
      params: { query, limit },
    });
    return response.data || [];
  },

  /**
   * Get screening history for current user
   */
  async getHistory(limit: number = 50): Promise<ScreeningResponse[]> {
    const response = await api.get('/api/v1/screen/history', {
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

    const response = await api.post('/api/v1/screen/bulk', formData, {
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
    const response = await api.get(`/api/v1/screen/bulk/${jobId}`);
    return response.data;
  },
};

export default screeningService;
