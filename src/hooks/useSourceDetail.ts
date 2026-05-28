import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';
import type { SourceDetail } from '@/types/api';

export function useSourceDetail(sourceId: string | null, enabled: boolean = true) {
  const detailQuery = useQuery<SourceDetail>({
    queryKey: ['admin', 'sources', 'detail', sourceId],
    queryFn: async () => {
      if (!sourceId) throw new Error('No source ID provided');
      return adminService.getSourceDetail(sourceId, false);
    },
    enabled: !!sourceId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    data: detailQuery.data,
    isLoading: detailQuery.isLoading,
    error: detailQuery.error,
    refetch: detailQuery.refetch,
  };
}

export function useCheckSourceUrl(sourceId: string | null) {
  const checkQuery = useQuery({
    queryKey: ['admin', 'sources', 'check-url', sourceId],
    queryFn: async () => {
      if (!sourceId) throw new Error('No source ID provided');
      return await adminService.checkSourceUrl(sourceId);
    },
    enabled: false, // Manual trigger
  });

  return {
    checkUrl: checkQuery.refetch,
    isChecking: checkQuery.isFetching,
    urlStatus: checkQuery.data,
  };
}

export default useSourceDetail;
