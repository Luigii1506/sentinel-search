import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';
import type { DashboardStats } from '@/types/api';

export function useDashboard() {
  const statsQuery = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => adminService.getStats(),
    staleTime: 60 * 1000, // 1 minute
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    error: statsQuery.error,
  };
}

export default useDashboard;
