import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export interface ServiceStatus {
  status: 'ok' | 'error' | 'unavailable' | 'not_connected';
  latency_ms?: number;
  detail?: string;
  http_status?: number;
  cluster_name?: string;
  pool?: {
    size: number;
    checked_in: number;
    checked_out: number;
    overflow: number;
  };
  connections?: {
    active: number;
    idle: number;
    idle_in_transaction: number;
    idle_in_transaction_stuck: number;
  };
  depths?: Record<string, number>;
  total_pending?: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  timestamp: string;
  services: {
    api: ServiceStatus;
    database: ServiceStatus;
    redis: ServiceStatus;
    opensearch: ServiceStatus;
    celery_queues?: ServiceStatus;
  };
  warnings?: string[];
}

/**
 * Polls /health every 30 seconds. The hook is resilient: when the backend
 * returns 503 the axios interceptor's auto-retry will re-issue once; if
 * that also fails we surface the raw HTTP error so the UI can render a
 * red "unhealthy" indicator instead of stale data.
 */
export function useHealthStatus(pollIntervalMs = 30_000) {
  return useQuery<HealthResponse | null>({
    queryKey: ['health'],
    queryFn: async () => {
      try {
        const response = await api.get<HealthResponse>('/health', {
          // Don't surface the 503 retry toast on the silent background poll —
          // the indicator itself is the user-facing signal.
          headers: { 'X-Silent-Retry': '1' },
        });
        return response.data;
      } catch (error: unknown) {
        const httpError = error as { response?: { status?: number; data?: HealthResponse } };
        // /health returns 503 with a HealthResponse body when degraded —
        // surface that body so the indicator can show what's down.
        if (httpError.response?.status === 503 && httpError.response.data) {
          return httpError.response.data;
        }
        return null;
      }
    },
    refetchInterval: pollIntervalMs,
    refetchIntervalInBackground: false,
    staleTime: pollIntervalMs / 2,
    retry: false,
  });
}
