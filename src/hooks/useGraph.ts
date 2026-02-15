import { useQuery } from '@tanstack/react-query';
import { graphService } from '@/services/graph';
import type { GraphData } from '@/types/api';

export function useGraph(entityId: string | undefined, options?: {
  depth?: number;
  enabled?: boolean;
}) {
  const graphQuery = useQuery<GraphData>({
    queryKey: ['graph', entityId, options?.depth],
    queryFn: () => graphService.getRelationships(entityId!, { depth: options?.depth || 2 }),
    enabled: !!entityId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: graphQuery.data,
    isLoading: graphQuery.isLoading,
    error: graphQuery.error,
  };
}

export default useGraph;
