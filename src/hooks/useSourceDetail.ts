import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';
import type { SourceDetail } from '@/types/api';

export function useSourceDetail(sourceId: string | null, enabled: boolean = true) {
  const detailQuery = useQuery<SourceDetail>({
    queryKey: ['admin', 'sources', 'detail', sourceId],
    queryFn: async () => {
      if (!sourceId) throw new Error('No source ID provided');
      console.log('🔍 Fetching source detail for:', sourceId);
      const data = await adminService.getSourceDetail(sourceId, false);
      console.log('✅ Source detail received:', data);
      return data;
    },
    enabled: !!sourceId && enabled,
    staleTime: 60 * 1000, // 1 minute
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
