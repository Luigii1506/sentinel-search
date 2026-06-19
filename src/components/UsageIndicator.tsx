import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Zap, ArrowUpRight } from 'lucide-react';
import { useUsage } from '@/hooks/useUsage';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type PlanKind = 'free' | 'starter' | 'pro' | 'enterprise';

function formatResetTime(t: TFunction, iso: string | null): string {
  if (!iso) return '';
  const reset = new Date(iso);
  const now = new Date();
  const diffMs = reset.getTime() - now.getTime();
  if (diffMs <= 0) return t('components.usage.soon');
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours >= 1) return t('components.usage.inHoursMinutes', { hours, minutes });
  return t('components.usage.inMinutes', { minutes });
}

export function UsageIndicator() {
  const { t } = useTranslation();
  const { data: usage } = useUsage();

  if (!usage || usage.daily_limit === null) {
    // Unlimited plan or no quota row — nothing to display.
    return null;
  }

  const { plan, daily_limit, used_today, remaining, resets_at } = usage;
  const pct = daily_limit > 0 ? Math.min(100, (used_today / daily_limit) * 100) : 0;

  // Color thresholds: green up to 70%, amber 70-90%, red after.
  const barColor =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-500' :
    'bg-blue-500';

  const textColor =
    remaining === 0 ? 'text-red-600 dark:text-red-300' :
    pct >= 70 ? 'text-amber-700 dark:text-amber-300' :
    'text-muted-foreground';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('components.usage.aria', { used: used_today, limit: daily_limit })}
          className={cn(
            'hidden sm:flex items-center gap-2 px-2.5 h-9 rounded-lg',
            'hover:bg-foreground/5 transition-colors group',
          )}
        >
          <Zap className={cn('w-3.5 h-3.5', textColor)} />
          <span className={cn('text-xs font-medium tabular-nums', textColor)}>
            {used_today}/{daily_limit}
          </span>
          <div className="hidden md:block w-16 h-1 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className={cn('h-full transition-all', barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">{t('components.usage.planLabel', { plan: t(`components.usage.plan.${(plan ?? 'free') as PlanKind}`) })}</span>
          <span className="text-xs text-muted-foreground">{t('components.usage.todayCount', { used: used_today, limit: daily_limit })}</span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-foreground/10 overflow-hidden mb-3">
          <div
            className={cn('h-full transition-all', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          {remaining === 0
            ? t('components.usage.limitReached')
            : remaining === 1
              ? t('components.usage.oneLeft')
              : t('components.usage.remaining', { count: remaining })}
        </p>

        {resets_at && (
          <p className="text-[11px] text-muted-foreground mb-3">
            {t('components.usage.resets', { time: formatResetTime(t, resets_at) })}
          </p>
        )}

        {plan === 'free' && (
          <Link
            to="/pricing"
            className={cn(
              'flex items-center justify-between gap-2 px-3 py-2 rounded-lg',
              'bg-gradient-to-r from-brand-blue/20 to-brand-electric/20',
              'border border-blue-500/30 text-sm text-blue-100',
              'hover:from-blue-500/30 hover:to-purple-500/30 transition-colors',
            )}
          >
            <span>{t('components.usage.upgrade')}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
