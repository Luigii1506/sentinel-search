/**
 * Sentinel foundation components.
 *
 * Every page-level construct that more than two routes need lives here.
 * If you find yourself reaching for a `Card + Skeleton + h1 + Button`
 * combo for the third time, factor it into this folder.
 *
 * Import as:
 *   import { PageHeader, EmptyState, DataTable, RiskBadge, MetricCard, SkeletonTable } from '@/components/foundation';
 */
export { PageHeader } from './PageHeader';
export { EmptyState } from './EmptyState';
export { DataTable } from './DataTable';
export type { DataTableColumn } from './DataTable';
export { RiskBadge, levelFromScore } from './RiskBadge';
export type { RiskLevel } from './RiskBadge';
export { MetricCard } from './MetricCard';
export { SkeletonTable } from './SkeletonTable';
