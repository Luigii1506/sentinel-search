import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';
import type { SourceSummary } from '@/types/api';

export function useSources() {
  const summaryQuery = useQuery<SourceSummary>({
    queryKey: ['admin', 'sources', 'summary'],
    queryFn: async () => {
      console.log('🔍 Fetching sources summary...');
      try {
        const data = await adminService.getSourcesSummary();
        console.log('✅ Sources data received:', data);
        return data;
      } catch (error) {
        console.error('❌ Error fetching sources:', error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    retryDelay: 1000,
  });

  console.log('📊 useSources state:', { 
    isLoading: summaryQuery.isLoading, 
    isError: summaryQuery.isError, 
    data: summaryQuery.data ? 'present' : 'null',
    error: summaryQuery.error 
  });

  return {
    data: summaryQuery.data,
    isLoading: summaryQuery.isLoading,
    error: summaryQuery.error,
    refetch: summaryQuery.refetch,
  };
}

export default useSources;
