import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin';
import type { MergeReviewResponse, MergedEntityDetail } from '@/types/api';

export interface MergeReviewFilters {
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
}

export function useMergeReview(params: MergeReviewFilters) {
  const query = useQuery<MergeReviewResponse>({
    queryKey: ['admin', 'merges', 'review', params],
    queryFn: () => adminService.getMergeReview(params),
    staleTime: 30 * 1000,
    retry: 2,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export function usePrefetchMerge() {
  const queryClient = useQueryClient();
  
  return function prefetchMerge(entityId: string) {
    return queryClient.prefetchQuery({
      queryKey: ['admin', 'merges', 'detail', entityId],
      queryFn: () => adminService.getMergeDetail(entityId),
      staleTime: 5 * 60 * 1000,
    });
  };
}

export function useMergeDetail(entityId: string | null, enabled: boolean = true) {
  const query = useQuery<MergedEntityDetail>({
    queryKey: ['admin', 'merges', 'detail', entityId],
    queryFn: async () => {
      if (!entityId) throw new Error('No entity ID');
      return await adminService.getMergeDetail(entityId);
    },
    enabled: !!entityId && enabled,
    staleTime: 60 * 1000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useMergeReview;
