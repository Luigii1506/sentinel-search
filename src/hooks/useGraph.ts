import { useQuery } from '@tanstack/react-query';
import { graphService } from '@/services/graph';
import type { NetworkData, GraphData } from '@/types/api';

// Hook for API v2 network endpoint
export function useNetwork(entityId: string | undefined, options?: {
  depth?: number;
  filter_types?: string[];
  enabled?: boolean;
}) {
  const networkQuery = useQuery<NetworkData>({
    queryKey: ['network', entityId, options?.depth, options?.filter_types],
    queryFn: () => graphService.getNetwork(entityId!, { 
      depth: options?.depth || 2,
      filter_types: options?.filter_types,
    }),
    enabled: !!entityId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: networkQuery.data,
    isLoading: networkQuery.isLoading,
    error: networkQuery.error,
    refetch: networkQuery.refetch,
  };
}

// Hook for API v2 relationships list endpoint
export function useRelationshipsList(entityId: string | undefined, options?: {
  type?: string;
  limit?: number;
  enabled?: boolean;
}) {
  const relationshipsQuery = useQuery<{
    entity_id: string;
    entity_name: string;
    relationships: Array<{
      direction: 'outgoing' | 'incoming';
      type: string;
      subtype?: string;
      related_entity_name: string;
      related_entity_id?: string;
      is_resolved: boolean;
      confidence: number;
    }>;
    total: number;
    by_type: Record<string, number>;
  }>({
    queryKey: ['relationships', entityId, options?.type, options?.limit],
    queryFn: () => graphService.getRelationshipsList(entityId!, {
      type: options?.type,
      limit: options?.limit || 50,
    }),
    enabled: !!entityId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: relationshipsQuery.data,
    isLoading: relationshipsQuery.isLoading,
    error: relationshipsQuery.error,
    refetch: relationshipsQuery.refetch,
  };
}

// Legacy hook (for compatibility)
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
