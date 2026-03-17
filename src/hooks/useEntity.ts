import { useQuery } from '@tanstack/react-query';
import { entityService } from '@/services/entities';
import type { EntityProfile } from '@/services/entities';
import type { APIEntity } from '@/types/api';

export function useEntity(entityId: string | undefined, source_level?: number) {
  const entityQuery = useQuery<APIEntity>({
    queryKey: ['entity', entityId, source_level],
    queryFn: () => entityService.getById(entityId!, source_level),
    enabled: !!entityId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    entity: entityQuery.data,
    isLoading: entityQuery.isLoading,
    error: entityQuery.error,
    refetch: entityQuery.refetch,
  };
}

export function useEntityProfile(entityId: string | undefined, lang: string = 'es') {
  const profileQuery = useQuery<EntityProfile>({
    queryKey: ['entity-profile', entityId, lang],
    queryFn: () => entityService.getProfile(entityId!, lang),
    enabled: !!entityId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
  };
}

export default useEntity;
