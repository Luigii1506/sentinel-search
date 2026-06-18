import api from './api';
import type {
  DashboardStats,
  AuditLogEntry,
  User,
  SourceSummary,
  SourceRuntimeHealthResponse,
  SourcesHealthOverviewResponse,
  SourceTimelineResponse,
  MonitoringOverviewResponse,
  OperationsSummaryResponse,
  JobsResponse,
  SourceDetail,
  SystemHealth,
  SystemCounts,
  MergeReviewResponse,
  MergedEntityDetail,
  FreshnessSloResponse,
  DataQualityReportResponse,
  DataQualityBySourceResponse,
  FalsePositiveSamplingReport,
  SearchSyncDlqResponse,
  TaskDlqResponse,
  RedisDurabilityStatus,
  DisappearedSourcesAuditResponse,
  SourceLifecycleEventsResponse,
} from '@/types/api';

export const adminService = {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const response = await api.get('/api/v1/admin/stats');
    return response.data;
  },

  /**
   * Get audit log
   */
  async getAuditLog(filters?: {
    user_id?: string;
    action?: string;
    entity_id?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: AuditLogEntry[]; total: number }> {
    const response = await api.get('/api/v1/admin/audit-log', { params: filters });
    return response.data;
  },

  /**
   * Export audit log
   */
  async exportAuditLog(format: 'csv' | 'json' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await api.get('/api/v1/admin/audit-log/export', {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get users list
   */
  async getUsers(): Promise<User[]> {
    const response = await api.get('/api/v1/admin/users');
    return response.data;
  },

  /**
   * Create user
   */
  async createUser(userData: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    role: string;
  }): Promise<User> {
    const response = await api.post('/api/v1/admin/users', userData);
    return response.data;
  },

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const response = await api.patch(`/api/v1/admin/users/${userId}`, updates);
    return response.data;
  },

  /**
   * Trigger data sync
   */
  async triggerSync(source?: string): Promise<{ task_id: string; status: string }> {
    const response = await api.post('/api/v1/admin/sync', { source });
    return response.data;
  },

  /**
   * v2: Trigger sync de una fuente específica (con validación de catálogo).
   * Usa /api/v2/sync/{source} que valida que la fuente existe en SourceRegistry,
   * elige la queue correcta y dispara el task de Celery.
   */
  async triggerSourceSync(
    sourceId: string,
    opts?: { force?: boolean }
  ): Promise<{ status: string; source: string; task_id?: string; queue?: string }> {
    const response = await api.post(`/api/v2/sync/${sourceId}`, null, {
      params: { force: opts?.force ?? false },
      timeout: 15000,
    });
    return response.data;
  },

  /**
   * Get sync status
   */
  async getSyncStatus(taskId: string): Promise<{
    task_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    message?: string;
    completed_at?: string;
  }> {
    const response = await api.get(`/api/v1/admin/sync/${taskId}`);
    return response.data;
  },

  /**
   * Clear cache
   */
  async clearCache(): Promise<{ message: string }> {
    const response = await api.delete('/api/v1/admin/cache');
    return response.data;
  },

  /**
   * Get webhooks configuration
   */
  async getWebhooks(): Promise<Array<{
    id: string;
    url: string;
    events: string[];
    is_active: boolean;
    created_at: string;
  }>> {
    const response = await api.get('/api/v1/admin/webhooks');
    return response.data;
  },

  /**
   * Create webhook
   */
  async createWebhook(webhook: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<{ id: string }> {
    const response = await api.post('/api/v1/admin/webhooks', webhook);
    return response.data;
  },

  /**
   * Get sources summary (K1 Dashboard)
   */
  async getSourcesSummary(): Promise<SourceSummary> {
    const response = await api.get('/api/v2/admin/sources/summary', { timeout: 60000 });
    return response.data;
  },

  async getSourceRuntimeHealth(): Promise<SourceRuntimeHealthResponse> {
    const response = await api.get('/api/v2/admin/sources/runtime-health', { timeout: 60000 });
    return response.data;
  },

  async getSourcesHealthOverview(): Promise<SourcesHealthOverviewResponse> {
    const response = await api.get('/api/v2/admin/sources/health-overview', { timeout: 30000 });
    return response.data;
  },

  async getSourcesActivity(opts?: {
    filter?: 'active' | 'all' | 'running' | 'failing' | 'critical' | 'never';
    tier?: 1 | 2 | 3 | 4;
    limit?: number;
  }): Promise<import('@/types/api').SourceActivityResponse> {
    const response = await api.get('/api/v2/admin/sources/activity', {
      params: { filter: opts?.filter, tier: opts?.tier, limit: opts?.limit ?? 100 },
      timeout: 15000,
    });
    return response.data;
  },

  // Dry-run del scheduler: qué decidiría AHORA. Útil para diagnosticar
  // "por qué no corrió X" sin abrir psql o leer logs del worker.
  async getSchedulerPreview(opts?: {
    only_in_window?: boolean;
  }): Promise<import('@/types/api').SchedulerPreviewResponse> {
    const response = await api.get('/api/v2/admin/scheduler/preview', {
      params: { only_in_window: opts?.only_in_window ?? false },
      timeout: 15000,
    });
    return response.data;
  },

  // Progreso por capa (bronze/silver/gold/os) de un source. Cacheado 30s
  // en backend — counts en tablas grandes cuestan segundos.
  async getPipelineProgress(sourceId: string): Promise<import('@/types/api').PipelineProgressResponse> {
    const response = await api.get(`/api/v2/admin/sources/${sourceId}/pipeline-progress`, {
      timeout: 25000,
    });
    return response.data;
  },

  async getSourceTimeline(sourceId: string, days: number = 7): Promise<SourceTimelineResponse> {
    const response = await api.get(`/api/v2/admin/sources/${sourceId}/timeline`, {
      params: { days },
      timeout: 15000,
    });
    return response.data;
  },

  async getSourceRuns(sourceId: string, limit: number = 15): Promise<import('@/types/api').SourceRunsResponse> {
    const response = await api.get(`/api/v2/admin/sources/${sourceId}/runs`, {
      params: { limit },
      timeout: 10000,
    });
    return response.data;
  },

  async getMonitoringOverview(): Promise<MonitoringOverviewResponse> {
    const response = await api.get('/api/v2/admin/monitoring/overview', {
      params: { jobs_limit: 50 },
      timeout: 60000,
    });
    return response.data;
  },

  async getOperationsSummary(): Promise<OperationsSummaryResponse> {
    const response = await api.get('/api/v2/admin/operations-summary', {
      timeout: 20000,
    });
    return response.data;
  },

  /**
   * Get jobs status (K5 Monitoring)
   */
  async getJobs(limit: number = 50): Promise<JobsResponse> {
    const response = await api.get('/api/v2/admin/jobs', { params: { limit } });
    return response.data;
  },

  /**
   * Get detailed health check (entity counts)
   */
  async getHealthDetailed(): Promise<{
    status: string;
    components: Record<string, { status: string }>;
    counts: SystemCounts;
  }> {
    const response = await api.get('/api/v2/admin/health/detailed');
    return response.data;
  },

  /**
   * Get system health (services status + latency)
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const response = await api.get('/health');
    return response.data;
  },

  /**
   * Get source detail — Auditoría K1
   */
  async getSourceDetail(sourceId: string, checkUrl: boolean = false): Promise<SourceDetail> {
    const response = await api.get(`/api/v2/admin/sources/${sourceId}/detail`, {
      params: { check_url: checkUrl }
    });
    return response.data;
  },

  /**
   * Get merge review — paginated list of merged Gold entities
   */
  async getMergeReview(params?: {
    limit?: number;
    offset?: number;
    min_sources?: number;
    sort_by?: string;
    match_method?: string;
    source_filter?: string;
    search?: string;
    entity_type?: string;
    min_confidence?: number;
    max_confidence?: number;
  }): Promise<MergeReviewResponse> {
    const response = await api.get('/api/v2/admin/merges/review', { params });
    return response.data;
  },

  /**
   * Get merge detail — full Gold entity with Silver children
   */
  async getMergeDetail(entityId: string): Promise<MergedEntityDetail> {
    const response = await api.get(`/api/v2/admin/merges/${entityId}/detail`);
    return response.data;
  },

  /**
   * Check if source URL is accessible
   */
  async checkSourceUrl(sourceId: string): Promise<{
    source_id: string;
    url: string | null;
    accessible: boolean;
    status: string;
    http_status?: number;
    response_time_ms?: number;
    error?: string;
  }> {
    const response = await api.post(`/api/v2/admin/sources/${sourceId}/check-url`);
    return response.data;
  },

  async getFreshnessSlo(): Promise<FreshnessSloResponse> {
    const response = await api.get('/api/v2/admin/freshness/slo');
    return response.data;
  },

  async getDataQuality(): Promise<DataQualityReportResponse> {
    const response = await api.get('/api/v2/admin/data-quality');
    return response.data;
  },

  async getDataQualityBySource(): Promise<DataQualityBySourceResponse> {
    const response = await api.get('/api/v2/admin/data-quality/by-source');
    return response.data;
  },

  async getFalsePositiveSampling(): Promise<FalsePositiveSamplingReport> {
    const response = await api.get('/api/v2/admin/data-quality/false-positive-samples');
    return response.data;
  },

  async getSearchSyncDlq(): Promise<SearchSyncDlqResponse> {
    const response = await api.get('/api/v2/admin/search-sync/dlq');
    return response.data;
  },

  async getTaskDlq(limit: number = 50): Promise<TaskDlqResponse> {
    const response = await api.get('/api/v2/admin/dlq', { params: { limit } });
    return response.data;
  },

  async getRedisDurability(): Promise<RedisDurabilityStatus> {
    const response = await api.get('/api/v2/admin/redis/durability');
    return response.data;
  },

  async getDisappearedSources(days: number = 30, minFailures: number = 3): Promise<DisappearedSourcesAuditResponse> {
    const response = await api.get('/api/v2/admin/sources/disappeared', {
      params: { days, min_failures: minFailures },
    });
    return response.data;
  },

  async getSourceLifecycleEvents(limit: number = 100): Promise<SourceLifecycleEventsResponse> {
    const response = await api.get('/api/v2/admin/sources/lifecycle/events', {
      params: { limit },
    });
    return response.data;
  },
};

export default adminService;
