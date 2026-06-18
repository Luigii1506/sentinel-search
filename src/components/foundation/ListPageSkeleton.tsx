import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AppPage } from './AppPage';
import { MetricGridSkeleton } from './MetricGridSkeleton';
import { PageHeaderSkeleton } from './PageHeaderSkeleton';

interface ListPageSkeletonProps {
  width?: 'narrow' | 'default' | 'wide';
  spacing?: 'compact' | 'default' | 'loose';
  metricCards?: number;
  rowCount?: number;
  showMetrics?: boolean;
  showFilters?: boolean;
  rowHeightClassName?: string;
  className?: string;
}

/**
 * Canonical loading shell for list/index pages with:
 * header -> metrics -> filters -> rows/table
 */
export function ListPageSkeleton({
  width = 'default',
  spacing = 'default',
  metricCards = 4,
  rowCount = 6,
  showMetrics = true,
  showFilters = true,
  rowHeightClassName = 'h-16',
  className,
}: ListPageSkeletonProps) {
  return (
    <AppPage width={width} spacing={spacing}>
      <div className={cn('space-y-6', className)}>
        <PageHeaderSkeleton />
        {showMetrics && <MetricGridSkeleton cards={metricCards} />}
        {showFilters && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-lg bg-white/10" />
            ))}
          </div>
        )}
        <div className="space-y-3">
          {Array.from({ length: rowCount }).map((_, i) => (
            <Skeleton key={i} className={cn('rounded-xl bg-white/10', rowHeightClassName)} />
          ))}
        </div>
      </div>
    </AppPage>
  );
}
