import { Skeleton } from '@/components/ui/skeleton';
import { AppPage } from './AppPage';
import { PageHeaderSkeleton } from './PageHeaderSkeleton';

interface DetailPageSkeletonProps {
  width?: 'narrow' | 'default' | 'wide';
}

/**
 * Canonical loading shell for detail pages with:
 * header -> hero card -> supporting panels
 */
export function DetailPageSkeleton({
  width = 'default',
}: DetailPageSkeletonProps) {
  return (
    <AppPage width={width}>
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <div className="glass rounded-2xl p-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-xl bg-white/10" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-64 bg-white/10" />
                  <Skeleton className="h-4 w-40 bg-white/10" />
                </div>
              </div>
              <Skeleton className="h-4 w-full max-w-md bg-white/10" />
              <Skeleton className="h-4 w-48 bg-white/10" />
            </div>
            <Skeleton className="h-40 w-40 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl bg-white/10" />
          <Skeleton className="h-80 rounded-xl bg-white/10 lg:col-span-2" />
        </div>
      </div>
    </AppPage>
  );
}
