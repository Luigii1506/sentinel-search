import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  CircleDashed,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * Generic status indicator — the non-risk sibling of <RiskBadge>.
 *
 * Use this for *operational* states that aren't a compliance risk:
 * job status, source health, sync state, webhook delivery, monitor
 * outcome, anything along the success/warning/error axis.
 *
 * Triple redundancy (color + icon + label) for the same a11y reasons
 * RiskBadge documents — never rely on color alone.
 *
 * Why this exists separately from <Badge> (shadcn): shadcn's Badge is
 * a styling primitive (variant=outline/destructive) with no semantic
 * meaning. StatusPill encodes *what the state is*, so screen readers
 * announce "Estado: completado" instead of just reading the visible
 * text, and developers can't accidentally use "destructive" for a
 * success state.
 */
export type StatusKind =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'pending'
  | 'running';

const VARIANTS: Record<
  StatusKind,
  { icon: LucideIcon; color: string; spin?: boolean }
> = {
  success: {
    icon: CheckCircle2,
    color: 'bg-green-500/15 text-green-200 border-green-500/40',
  },
  warning: {
    icon: AlertTriangle,
    color: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
  },
  error: {
    icon: XCircle,
    color: 'bg-red-500/15 text-red-200 border-red-500/40',
  },
  info: {
    icon: Info,
    color: 'bg-electric-500/15 text-electric-200 border-electric-500/40',
  },
  neutral: {
    icon: CircleDashed,
    color: 'bg-secondary text-muted-foreground border-border',
  },
  pending: {
    icon: Clock,
    color: 'bg-blue-500/15 text-blue-200 border-blue-500/40',
  },
  running: {
    icon: Loader2,
    color: 'bg-electric-500/15 text-electric-200 border-electric-500/40',
    spin: true,
  },
};

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
} as const;

const ICON_SIZE = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
} as const;

interface StatusPillProps {
  kind: StatusKind;
  /** Override the default Spanish label ("Completado", "Error", …). */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Hide the icon — only do this in *very* dense lists. Drops one
   *  layer of the triple-redundancy; the label stays. */
  showIcon?: boolean;
  /** Hover/focus tooltip text. Useful for surfacing the error message
   *  on a failed job without burning row height. */
  title?: string;
  className?: string;
}

export function StatusPill({
  kind,
  label,
  size = 'md',
  showIcon = true,
  title,
  className,
}: StatusPillProps) {
  const { t } = useTranslation();
  const v = VARIANTS[kind];
  const Icon = v.icon;
  const text = label ?? t(`components.foundation.statusPill.${kind}`);
  return (
    <span
      role="status"
      aria-label={t('components.foundation.statusPill.aria', { label: text })}
      title={title}
      className={cn(
        'inline-flex items-center font-medium rounded-full border whitespace-nowrap',
        v.color,
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showIcon && (
        <Icon
          className={cn(ICON_SIZE[size], v.spin && 'animate-spin')}
          aria-hidden="true"
        />
      )}
      {text}
    </span>
  );
}

/**
 * Coerce a backend job/source/webhook status string into a StatusKind.
 * Centralized so every page maps the same way — "failed" is always
 * 'error', "running" is always 'running', etc.
 *
 * Returns 'neutral' for unrecognized values rather than throwing, so
 * a new backend status doesn't crash the UI; it just renders gray.
 */
export function statusKindFromString(s: string | null | undefined): StatusKind {
  if (!s) return 'neutral';
  const v = s.toLowerCase();
  if (['success', 'completed', 'ok', 'healthy', 'delivered', 'active'].includes(v)) return 'success';
  if (['warning', 'degraded', 'stale', 'partial'].includes(v)) return 'warning';
  if (['error', 'failed', 'failure', 'unhealthy', 'rejected'].includes(v)) return 'error';
  if (['info', 'queued'].includes(v)) return 'info';
  if (['running', 'in_progress', 'processing', 'syncing'].includes(v)) return 'running';
  if (['pending', 'waiting', 'scheduled'].includes(v)) return 'pending';
  return 'neutral';
}
