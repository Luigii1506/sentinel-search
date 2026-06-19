import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PageHeaderSkeletonProps {
  showIcon?: boolean;
  showActions?: boolean;
  showDescription?: boolean;
  className?: string;
}

/**
 * Canonical loading shell for the top of any route.
 *
 * Use this instead of one-off `h-8 w-48` title placeholders so every
 * page enters with the same rhythm: icon, title, description, actions.
 */
export function PageHeaderSkeleton({
  showIcon = true,
  showActions = true,
  showDescription = true,
  className,
}: PageHeaderSkeletonProps) {
  const { t } = useTranslation();
  return (
    <div className={cn('space-y-4', className)} role="status" aria-label={t('common.states.loading')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {showIcon && <Skeleton className="h-11 w-11 rounded-xl bg-foreground/10" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-8 w-56 max-w-full bg-foreground/10" />
            {showDescription && <Skeleton className="h-4 w-72 max-w-full bg-foreground/10" />}
          </div>
        </div>
        {showActions && (
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-9 w-24 rounded-lg bg-foreground/10" />
            <Skeleton className="h-9 w-28 rounded-lg bg-foreground/10" />
          </div>
        )}
      </div>
    </div>
  );
}
