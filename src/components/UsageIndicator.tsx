import { Link } from 'react-router-dom';
import { Zap, ArrowUpRight } from 'lucide-react';
import { useUsage } from '@/hooks/useUsage';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const PLAN_LABEL = {
  free: 'Gratis',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
} as const;

function formatResetTime(iso: string | null): string {
  if (!iso) return '';
  const reset = new Date(iso);
  const now = new Date();
  const diffMs = reset.getTime() - now.getTime();
  if (diffMs <= 0) return 'pronto';
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hours >= 1) return `en ${hours}h ${minutes}m`;
  return `en ${minutes}m`;
}

export function UsageIndicator() {
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
    remaining === 0 ? 'text-red-300' :
    pct >= 70 ? 'text-amber-300' :
    'text-gray-300';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Búsquedas: ${used_today}/${daily_limit}`}
          className={cn(
            'hidden sm:flex items-center gap-2 px-2.5 h-9 rounded-lg',
            'hover:bg-white/5 transition-colors group',
          )}
        >
          <Zap className={cn('w-3.5 h-3.5', textColor)} />
          <span className={cn('text-xs font-medium tabular-nums', textColor)}>
            {used_today}/{daily_limit}
          </span>
          <div className="hidden md:block w-16 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className={cn('h-full transition-all', barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Plan {PLAN_LABEL[plan ?? 'free']}</span>
          <span className="text-xs text-gray-500">{used_today} / {daily_limit} hoy</span>
        </div>

        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
          <div
            className={cn('h-full transition-all', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-xs text-gray-400 mb-3">
          {remaining === 0
            ? 'Has alcanzado el límite diario.'
            : remaining === 1
              ? 'Te queda 1 búsqueda hoy.'
              : `Te quedan ${remaining} búsquedas hoy.`}
        </p>

        {resets_at && (
          <p className="text-[11px] text-gray-500 mb-3">
            El contador se reinicia {formatResetTime(resets_at)}.
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
            <span>Upgrade para más búsquedas</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
