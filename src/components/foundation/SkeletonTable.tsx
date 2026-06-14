import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SkeletonTableProps {
  /** How many placeholder rows to render. Default 5. */
  rows?: number;
  /** Width pattern per column, expressed as the Tailwind w-* class.
   *  Pass an array; length = number of columns. Defaults to a 5-col
   *  layout that mirrors the audit / api-keys tables. */
  columns?: string[];
  /** Optional row height override. */
  rowHeight?: string;
  className?: string;
}

const DEFAULT_COLUMNS = ['w-32', 'w-24', 'w-16', 'w-40', 'w-16'];

/**
 * Inline skeleton for any table while data is loading. Replaces the
 * ad-hoc `[1,2,3].map(i => <Skeleton h-14/>)` blocks repeated across
 * the app — same rhythm, less code, scannable structure.
 */
export function SkeletonTable({
  rows = 5,
  columns = DEFAULT_COLUMNS,
  rowHeight = 'h-4',
  className,
}: SkeletonTableProps) {
  return (
    <div
      role="status"
      aria-label="Cargando datos"
      className={cn('p-4 space-y-3', className)}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-2 border-b border-navy-600/40 last:border-0"
        >
          {columns.map((w, j) => (
            <Skeleton key={j} className={cn(rowHeight, w, 'rounded-md')} />
          ))}
        </div>
      ))}
    </div>
  );
}
