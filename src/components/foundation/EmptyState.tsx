import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Lucide icon component to render at the top. */
  icon: LucideIcon;
  /** Short headline — what's missing. */
  title: string;
  /** One-sentence explanation of why it's empty and what to do next. */
  description?: string;
  /** Primary CTA (usually a button). NN/g: empty states should drive
   *  the next action, not just announce absence. */
  action?: ReactNode;
  /** Tone — neutral (default) for blank state, success when the absence
   *  is good news ("no critical alerts pending"), warning for caution. */
  tone?: 'neutral' | 'success' | 'warning';
  className?: string;
}

const TONE_STYLES = {
  neutral: {
    iconColor: 'text-muted-foreground',
    iconBg: 'bg-muted',
  },
  success: {
    iconColor: 'text-green-700 dark:text-green-400',
    iconBg: 'bg-green-500/10 border border-green-500/20',
  },
  warning: {
    iconColor: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-500/10 border border-amber-500/20',
  },
} as const;

/**
 * Empty / zero / no-results panel. Always pair with an action when an
 * action makes sense at this surface (per NN/g empty-state guidance).
 *
 * Tone semantics:
 *   - neutral: "Nothing here yet." (e.g., first-run watchlist)
 *   - success: "All clear." (e.g., 0 critical alerts)
 *   - warning: "Heads-up." (e.g., quota almost exhausted)
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: EmptyStateProps) {
  const t = TONE_STYLES[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'glass rounded-xl p-8 sm:p-12 text-center flex flex-col items-center',
        className,
      )}
    >
      <div
        className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
          t.iconBg,
        )}
      >
        <Icon className={cn('w-7 h-7', t.iconColor)} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-5">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
