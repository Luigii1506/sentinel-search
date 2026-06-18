import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PanelSkeletonProps {
  lines?: number;
  className?: string;
  titleWidthClassName?: string;
  lineWidthClassNames?: string[];
}

/**
 * Generic skeleton for cards, dialogs and inline detail panels.
 */
export function PanelSkeleton({
  lines = 3,
  className,
  titleWidthClassName = 'w-40',
  lineWidthClassNames,
}: PanelSkeletonProps) {
  return (
    <div className={cn('glass rounded-xl p-4 space-y-3', className)} role="status" aria-label="Cargando panel">
      <Skeleton className={cn('h-5 bg-white/10', titleWidthClassName)} />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              'h-4 bg-white/10',
              lineWidthClassNames?.[i] ?? (i === lines - 1 ? 'w-2/3' : 'w-full'),
            )}
          />
        ))}
      </div>
    </div>
  );
}
