import { useQuery } from '@tanstack/react-query';
import { entityService } from '@/services/entities';
import type { APIEntity } from '@/types/api';

export function useEntity(entityId: string | undefined) {
  const entityQuery = useQuery<APIEntity>({
    queryKey: ['entity', entityId],
    queryFn: () => entityService.getById(entityId!),
    enabled: !!entityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    entity: entityQuery.data,
    isLoading: entityQuery.isLoading,
    error: entityQuery.error,
    refetch: entityQuery.refetch,
  };
}

export default useEntity;
