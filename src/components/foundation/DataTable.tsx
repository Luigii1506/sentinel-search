import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Column descriptor. Each column knows how to render a header label,
 * an optional cell renderer, an optional class for alignment, and a
 * `primary` flag — the primary column is the one we promote to the
 * card heading on mobile (so the user sees the most important field
 * first when the table collapses).
 */
export interface DataTableColumn<T> {
  /** Stable identifier (use this as React key). */
  id: string;
  /** Header label rendered in <th>. */
  header: ReactNode;
  /** Cell renderer. If omitted, the row is accessed by `id` as a key. */
  cell: (row: T, index: number) => ReactNode;
  /** Header / cell alignment utility (text-right for numeric, etc.). */
  align?: 'left' | 'right' | 'center';
  /** Promote to the card title on mobile. Mark exactly one column. */
  primary?: boolean;
  /** Hide on mobile entirely. Use for low-value columns (IDs, IPs)
   *  that would clutter the card layout. */
  hideOnMobile?: boolean;
  /** Optional sub-label shown below the value on mobile cards. */
  mobileLabel?: ReactNode;
  /** Optional class applied to the <th> and <td>. */
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  /** Stable row key extractor. */
  getRowId: (row: T) => string;
  /** Optional row click — when set, rows render with hover affordance
   *  and cursor-pointer. */
  onRowClick?: (row: T) => void;
  /** Empty-state node to render when data.length === 0. Caller is
   *  expected to pass <EmptyState> so the wording fits the context. */
  empty?: ReactNode;
  /** Loading skeleton. Pass <SkeletonTable> for the canonical shape. */
  loading?: boolean;
  loadingPlaceholder?: ReactNode;
  /** Sticky table header (useful for long lists). */
  stickyHeader?: boolean;
  /** Extra wrapper class. */
  className?: string;
}

/**
 * Responsive table primitive.
 *
 * Behavior:
 *   - md and up:  classic <table> with semantic <th>/<td>, horizontal
 *                 scroll wrapper, optional sticky header.
 *   - below md:   each row collapses into a card. The column marked
 *                 `primary` becomes the card title; the rest render
 *                 as label/value rows. Columns marked `hideOnMobile`
 *                 disappear entirely.
 *
 * Why: every table in the app currently has either `overflow-x-auto`
 * (kicks the can down the road — analyst now horizontal-scrolls on
 * mobile) or no responsiveness at all. NN/g recommends locking the
 * first column on mobile; we go further and stack as cards because
 * compliance tables typically have 5–8 columns where horizontal scroll
 * becomes unusable below 640px.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  empty,
  loading,
  loadingPlaceholder,
  stickyHeader,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return <div className={className}>{loadingPlaceholder}</div>;
  }

  if (data.length === 0 && empty) {
    return <div className={className}>{empty}</div>;
  }

  const primaryCol = columns.find((c) => c.primary) ?? columns[0];
  const mobileCols = columns.filter((c) => !c.hideOnMobile && c.id !== primaryCol.id);

  const alignClass = (a?: 'left' | 'right' | 'center') =>
    a === 'right'  ? 'text-right' :
    a === 'center' ? 'text-center' :
    'text-left';

  return (
    <div className={className}>
      {/* ───────── Desktop / tablet ≥ md ───────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={cn(stickyHeader && 'sticky top-0 bg-card z-10')}>
            <tr className="border-b border-navy-500 text-left text-xs uppercase tracking-wide text-navy-200">
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn('px-4 py-3 font-medium', alignClass(col.align), col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-navy-600/40 transition-colors',
                  onRowClick && 'hover:bg-navy-700/60 cursor-pointer',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn('px-4 py-3', alignClass(col.align), col.className)}
                  >
                    {col.cell(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ───────── Mobile < md (stacked cards) ───────── */}
      <div className="md:hidden divide-y divide-navy-600/40">
        {data.map((row, i) => (
          <div
            key={getRowId(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              'p-4 space-y-2',
              onRowClick && 'hover:bg-navy-700/60 cursor-pointer active:bg-navy-700',
            )}
          >
            {/* Primary column = card heading */}
            <div className="text-sm font-medium text-white">
              {primaryCol.cell(row, i)}
            </div>
            {/* Remaining columns as label/value list */}
            {mobileCols.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                {mobileCols.map((col) => (
                  <div key={col.id} className="contents">
                    <dt className="text-navy-200 truncate">
                      {col.mobileLabel ?? col.header}
                    </dt>
                    <dd className="text-navy-50 text-right truncate">
                      {col.cell(row, i)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
