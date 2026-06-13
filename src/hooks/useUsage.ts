import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export type Plan = 'free' | 'starter' | 'pro' | 'enterprise' | null;

export interface UsageSnapshot {
  plan: Plan;
  daily_limit: number | null;   // null = unlimited
  used_today: number;
  remaining: number | null;     // null = unlimited
  resets_at: string | null;     // ISO 8601 (next midnight UTC)
}

const QUERY_KEY = ['usage'] as const;

/**
 * Polls /api/v1/auth/me/usage to drive the navbar counter and any
 * "you have N searches left" UX. Quota state changes at most once per
 * screening call, so a 60s interval plus invalidation on screening
 * mutations (see useScreening) is plenty.
 */
export function useUsage(pollIntervalMs = 60_000) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // The axios 402 interceptor fires a 'quota:exhausted' window event after
  // it shows the upgrade toast. Listen here so the navbar counter snaps
  // to 0 remaining without waiting for the next 60s poll.
  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    };
    window.addEventListener('quota:exhausted', handler);
    return () => window.removeEventListener('quota:exhausted', handler);
  }, [isAuthenticated, queryClient]);

  return useQuery<UsageSnapshot | null>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const { data } = await api.get<UsageSnapshot>('/api/v1/auth/me/usage');
        return data;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    refetchInterval: pollIntervalMs,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

/**
 * Force-refresh the usage snapshot. Call this from screening flows
 * right after a successful (or 402) response so the navbar updates
 * without waiting on the next poll tick.
 */
export function useInvalidateUsage() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}
