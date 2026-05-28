import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';
import type { SourceSummary } from '@/types/api';

export function useSources() {
  const summaryQuery = useQuery<SourceSummary>({
    queryKey: ['admin', 'sources', 'summary'],
    queryFn: () => adminService.getSourcesSummary(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });

  return {
    data: summaryQuery.data,
    isLoading: summaryQuery.isLoading,
    error: summaryQuery.error,
    refetch: summaryQuery.refetch,
  };
}

export default useSources;
