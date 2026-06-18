import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MetricGridSkeletonProps {
  cards?: number;
  className?: string;
  cardClassName?: string;
}

/**
 * Canonical skeleton row for dashboard KPIs.
 */
export function MetricGridSkeleton({
  cards = 4,
  className,
  cardClassName,
}: MetricGridSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className={cn('rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-3', cardClassName)}
        >
          <Skeleton className="h-4 w-24 bg-white/10" />
          <Skeleton className="h-8 w-20 bg-white/10" />
        </div>
      ))}
    </div>
  );
}
